#!/usr/bin/env python3
"""
Dynamic Costco product scraper for warehouse locations.

This script:
- Makes paginated requests to Costco's Fusion API search endpoint
- Filters for InWarehouse items only
- Handles pagination automatically
- Updates Supabase database with location-specific inventory
- Deactivates items no longer in inventory

Usage:
    python3 costco_dynamic_scraper.py --location-number 681-wh
    python3 costco_dynamic_scraper.py --location-number 681-wh --rows 50 --delay 2.0
"""

import argparse
import logging
import os
import random
import sys
import time
from typing import Dict, List, Optional, Set
from urllib.parse import urlencode

import requests
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

from import_costco_fusion_api import CostcoFusionAPIImporter

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CostcoDynamicScraper:
    """Dynamic scraper for Costco warehouse inventory."""
    
    API_BASE_URL = "https://search.costco.com/api/apps/www_costco_com/query/www_costco_com_navigation"
    API_KEY = "273db6be-f015-4de7-b0d6-dd4746ccd5c3"
    
    DEFAULT_ROWS = 24
    DEFAULT_DELAY = 1.0
    DEFAULT_DELAY_VARIANCE = 0.5  # Random variance in delay (seconds)
    MAX_RETRIES = 3
    
    def __init__(
        self,
        location_number: str,
        rows: int = DEFAULT_ROWS,
        delay: float = DEFAULT_DELAY,
        delay_variance: float = DEFAULT_DELAY_VARIANCE,
        category_url: str = "/grocery-household.html"
    ):
        """
        Initialize the scraper.
        
        Args:
            location_number: Costco warehouse location number (e.g., "681-wh")
            rows: Number of items per page (default: 24)
            delay: Delay between requests in seconds (default: 1.0)
            category_url: Category URL to filter by (default: "/grocery-household.html")
        """
        self.location_number = location_number
        self.rows = rows
        self.delay = delay
        self.delay_variance = delay_variance
        self.category_url = category_url
        
        # Initialize importer
        self.importer = CostcoFusionAPIImporter(location_number=location_number)
        
        # Setup session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=self.MAX_RETRIES,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Headers to match browser requests
        self.headers = {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.5',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'dnt': '1',
            'host': 'search.costco.com',
            'origin': 'https://www.costco.com',
            'pragma': 'no-cache',
            'referer': 'https://www.costco.com/',
            'sec-ch-ua': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'sec-gpc': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'x-api-key': self.API_KEY
        }
        
        self.session.headers.update(self.headers)
        
        # Visit main page first to establish session and get cookies
        self._establish_session()
        
        logger.info(f"Initialized scraper for location: {location_number}")
        logger.info(f"Rows per page: {rows}, Delay: {delay}s (±{delay_variance}s)")
    
    def _establish_session(self):
        """Visit main Costco page to establish session and get initial cookies."""
        try:
            logger.debug("Establishing session with Costco...")
            response = self.session.get(
                'https://www.costco.com/',
                timeout=15,
                allow_redirects=True
            )
            response.raise_for_status()
            logger.debug("Session established successfully")
        except Exception as e:
            logger.warning(f"Failed to establish session (continuing anyway): {e}")
    
    def _get_random_delay(self) -> float:
        """Get a random delay with variance to avoid detection."""
        if self.delay <= 0:
            return 0
        
        variance = random.uniform(-self.delay_variance, self.delay_variance)
        delay = max(0.5, self.delay + variance)  # Minimum 0.5 seconds
        return delay
    
    def build_request_params(self, start: int, category_url: Optional[str] = None) -> Dict[str, str]:
        """Build query parameters for API request."""
        url = category_url or self.category_url
        params = {
            'expoption': 'lucidworks',
            'q': '*:*',
            'locale': 'en-US',
            'start': str(start),
            'expand': 'false',
            'userLocation': 'TX',  # TODO: Make this configurable
            'loc': self._build_location_string(),  # All locations for user
            'whloc': self.location_number,  # Filter to specific warehouse
            'rows': str(self.rows),
            'url': url,
            'fq': '{!tag=item_program_eligibility}item_program_eligibility:("InWarehouse")',
            'chdcategory': 'true',
            'chdheader': 'true'
        }
        return params
    
    def _build_location_string(self) -> str:
        """
        Build the location string with all possible locations.
        This is based on the example URL provided by the user.
        """
        # Common Costco location patterns - this matches the example
        locations = [
            "655-bd", "681-wh", "1254-3pl", "1321-wm", "1472-3pl", "283-wm",
            "561-wm", "725-wm", "731-wm", "758-wm", "759-wm",
            "847_0-cor", "847_0-cwt", "847_0-edi", "847_0-ehs", "847_0-membership",
            "847_0-mpt", "847_0-spc", "847_0-wm", "847_1-cwt", "847_1-edi",
            "847_d-fis", "847_lg_ntx-edi", "847_lux_us11-edi", "847_NA-cor",
            "847_NA-pharmacy", "847_NA-wm", "847_ss_u359-edi", "847_wp_r455-edi",
            "951-wm", "952-wm", "9847-wcs"
        ]
        return ','.join(locations)
    
    def fetch_page(self, start: int, category_url: Optional[str] = None) -> Optional[Dict]:
        """
        Fetch a single page of results from the API.
        
        Args:
            start: Starting offset for pagination
            category_url: Optional category URL to override default
            
        Returns:
            API response JSON as dict, or None on failure
        """
        params = self.build_request_params(start, category_url)
        
        try:
            logger.debug(f"Fetching page: start={start}, rows={self.rows}")
            
            # Add small random delay before request to avoid patterns
            pre_delay = random.uniform(0.1, 0.3)
            time.sleep(pre_delay)
            
            response = self.session.get(self.API_BASE_URL, params=params, timeout=30)
            
            if response.status_code == 429:
                # Rate limited - wait longer with backoff
                wait_time = self.delay * 5 + random.uniform(2, 5)
                logger.warning(f"Rate limited (429). Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
                # Re-establish session after rate limit
                self._establish_session()
                # Retry once more
                response = self.session.get(self.API_BASE_URL, params=params, timeout=30)
            
            response.raise_for_status()
            data = response.json()
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch page (start={start}): {e}")
            return None
        except ValueError as e:
            logger.error(f"Failed to parse JSON response (start={start}): {e}")
            return None
    
    def filter_items_for_location(self, items: List[Dict], seen_item_ids: Set[str]) -> List[Dict]:
        """
        Filter items to only include those for the target location and not already seen.
        
        Args:
            items: List of item dictionaries from API response
            seen_item_ids: Set of item IDs already processed (to avoid duplicates)
            
        Returns:
            Filtered list of items matching the target location and not yet seen
        """
        filtered = []
        for item in items:
            item_location = item.get('item_location_locationNumber')
            item_id = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', ''))
            
            if item_location != self.location_number:
                logger.debug(f"Skipping item {item_id} - location {item_location} != {self.location_number}")
                continue
            
            if item_id in seen_item_ids:
                logger.debug(f"Skipping duplicate item {item_id}")
                continue
            
            filtered.append(item)
            seen_item_ids.add(item_id)
        
        return filtered
    
    def extract_categories_from_facets(self, data: Dict) -> List[Dict[str, str]]:
        """
        Extract category URLs from API response facets.
        
        Args:
            data: API response JSON dict
            
        Returns:
            List of category dicts with 'url' and 'name' keys
        """
        categories = []
        facets = data.get('facets', {})
        item_category = facets.get('item_category', {})
        buckets = item_category.get('buckets', [])
        
        for bucket in buckets:
            meta = bucket.get('meta')
            if meta and isinstance(meta, str) and meta.startswith('/'):
                # Extract category name from bucket value
                # Format: "1|Grocery & Household Essentials|Snacks"
                val = bucket.get('val', '')
                name_parts = val.split('|')
                category_name = name_parts[-1] if len(name_parts) > 1 else val
                
                categories.append({
                    'url': meta,
                    'name': category_name,
                    'count': bucket.get('count', 0)
                })
        
        return categories
    
    def scrape_category(self, category_url: str, seen_item_ids: Set[str]) -> Dict[str, any]:
        """
        Scrape all pages for a specific category.
        
        Args:
            category_url: Category URL to scrape
            seen_item_ids: Set of item IDs already processed (to avoid duplicates)
            
        Returns:
            Dictionary with statistics about the category scrape
        """
        logger.info(f"Scraping category: {category_url}")
        
        # Fetch first page to get total count
        first_page_data = self.fetch_page(0, category_url)
        
        if not first_page_data:
            logger.warning(f"Failed to fetch first page for {category_url}, skipping...")
            return {
                'success': False,
                'total_pages': 0,
                'total_items': 0,
                'imported': 0,
                'failed': 0,
                'errors': [f'Failed to fetch first page for {category_url}']
            }
        
        response = first_page_data.get('response', {})
        total_found = response.get('numFound', 0)
        
        if total_found == 0:
            logger.debug(f"No items found for category {category_url}")
            return {
                'success': True,
                'total_pages': 0,
                'total_items': 0,
                'imported': 0,
                'failed': 0,
                'errors': []
            }
        
        # Calculate total pages
        total_pages = (total_found + self.rows - 1) // self.rows
        logger.info(f"  Category has {total_found} items across {total_pages} pages")
        
        stats = {
            'success': True,
            'total_pages': total_pages,
            'total_items': total_found,
            'imported': 0,
            'failed': 0,
            'errors': [],
            'pages_processed': 0,
            'pages_failed': 0
        }
        
        # Process first page
        items = response.get('docs', [])
        filtered_items = self.filter_items_for_location(items, seen_item_ids)
        
        logger.info(f"  Page 1/{total_pages}: {len(items)} items received, {len(filtered_items)} new items for location")
        
        if filtered_items:
            try:
                page_stats = self.importer.import_from_api_response({
                    'response': {
                        'docs': filtered_items,
                        'numFound': len(filtered_items)
                    }
                })
                
                stats['imported'] += page_stats.get('imported', 0)
                stats['failed'] += page_stats.get('failed', 0)
                stats['errors'].extend(page_stats.get('errors', []))
            except Exception as e:
                logger.error(f"  Error importing page 1: {e}")
                stats['failed'] += len(filtered_items)
                stats['errors'].append(f"Page 1 import error: {str(e)}")
        
        stats['pages_processed'] = 1
        
        # Process remaining pages
        for page in range(1, total_pages):
            start = page * self.rows
            
            # Rate limiting with random variance
            if self.delay > 0:
                delay = self._get_random_delay()
                logger.debug(f"  Waiting {delay:.2f}s before page {page + 1}...")
                time.sleep(delay)
            
            logger.info(f"  Page {page + 1}/{total_pages}: Fetching items {start} to {start + self.rows - 1}...")
            
            try:
                page_data = self.fetch_page(start, category_url)
                
                if not page_data:
                    logger.warning(f"  Failed to fetch page {page + 1} for {category_url}, skipping...")
                    stats['pages_failed'] += 1
                    continue
                
                response = page_data.get('response', {})
                items = response.get('docs', [])
                filtered_items = self.filter_items_for_location(items, seen_item_ids)
                
                logger.info(f"    {len(items)} items received, {len(filtered_items)} new items")
                
                if not filtered_items:
                    stats['pages_processed'] += 1
                    continue
                
                # Import this page
                try:
                    page_stats = self.importer.import_from_api_response({
                        'response': {
                            'docs': filtered_items,
                            'numFound': len(filtered_items)
                        }
                    })
                    
                    stats['imported'] += page_stats.get('imported', 0)
                    stats['failed'] += page_stats.get('failed', 0)
                    stats['errors'].extend(page_stats.get('errors', []))
                except Exception as e:
                    logger.error(f"    Error importing page {page + 1}: {e}")
                    stats['failed'] += len(filtered_items)
                    stats['errors'].append(f"Page {page + 1} import error: {str(e)}")
                
                stats['pages_processed'] += 1
                
                # Progress update every 5 pages
                if (page + 1) % 5 == 0:
                    logger.info(f"    Progress: {page + 1}/{total_pages} pages, {stats['imported']} items imported so far")
                    
            except Exception as e:
                logger.error(f"  Exception on page {page + 1}: {e}")
                stats['pages_failed'] += 1
                stats['errors'].append(f"Page {page + 1} exception: {str(e)}")
                continue
        
        logger.info(f"  Category complete: {stats['imported']} items imported, {stats['failed']} failed, {stats['pages_processed']} pages processed")
        return stats
    
    def scrape_all_categories(self) -> Dict[str, any]:
        """
        Scrape all grocery categories and subcategories for the location.
        
        Returns:
            Dictionary with statistics about the complete scrape
        """
        logger.info("=" * 60)
        logger.info("Starting Costco inventory scrape - ALL CATEGORIES")
        logger.info("=" * 60)
        
        # Start with main grocery page to get all categories
        logger.info("Fetching main grocery page to discover all categories...")
        first_page_data = self.fetch_page(0, '/grocery-household.html')
        
        if not first_page_data:
            logger.error("Failed to fetch main grocery page. Aborting.")
            return {
                'success': False,
                'total_categories': 0,
                'total_items': 0,
                'imported': 0,
                'failed': 0,
                'errors': ['Failed to fetch main grocery page']
            }
        
        # Extract all categories from facets
        categories = self.extract_categories_from_facets(first_page_data)
        
        if not categories:
            logger.warning("No categories found in facets. Falling back to single category scrape.")
            return self.scrape_all_pages()
        
        logger.info(f"Found {len(categories)} categories to scrape:")
        for cat in categories[:10]:  # Show first 10
            logger.info(f"  - {cat['name']}: {cat['url']} ({cat['count']} items)")
        if len(categories) > 10:
            logger.info(f"  ... and {len(categories) - 10} more categories")
        
        # Track seen item IDs across all categories to avoid duplicates
        seen_item_ids: Set[str] = set()
        all_item_ids: Set[str] = set()
        
        # Aggregate stats
        total_stats = {
            'success': True,
            'total_categories': len(categories),
            'categories_processed': 0,
            'categories_failed': 0,
            'total_items': 0,
            'imported': 0,
            'failed': 0,
            'errors': [],
            'total_pages': 0,
            'pages_processed': 0,
            'pages_failed': 0
        }
        
        # Scrape each category
        for i, category in enumerate(categories, 1):
            logger.info("")
            logger.info("=" * 60)
            logger.info(f"[{i}/{len(categories)}] Processing category: {category['name']}")
            logger.info(f"  URL: {category['url']}")
            logger.info(f"  Expected items: {category['count']}")
            logger.info("=" * 60)
            
            try:
                category_stats = self.scrape_category(category['url'], seen_item_ids)
            except Exception as e:
                logger.error(f"Exception while scraping category {category['name']}: {e}")
                category_stats = {
                    'success': False,
                    'total_pages': 0,
                    'total_items': 0,
                    'imported': 0,
                    'failed': 0,
                    'errors': [f'Exception: {str(e)}'],
                    'pages_processed': 0,
                    'pages_failed': 0
                }
            
            # Aggregate statistics
            total_stats['categories_processed'] += 1
            total_stats['total_items'] += category_stats.get('total_items', 0)
            total_stats['imported'] += category_stats.get('imported', 0)
            total_stats['failed'] += category_stats.get('failed', 0)
            total_stats['total_pages'] += category_stats.get('total_pages', 0)
            total_stats['pages_processed'] += category_stats.get('pages_processed', 0)
            total_stats['pages_failed'] += category_stats.get('pages_failed', 0)
            total_stats['errors'].extend(category_stats.get('errors', []))
            
            if not category_stats.get('success', False):
                total_stats['categories_failed'] += 1
            
            # Collect all item IDs
            for item_id in seen_item_ids:
                all_item_ids.add(item_id)
            
            # Progress update every category
            logger.info("")
            logger.info(f"Overall Progress: {i}/{len(categories)} categories, {total_stats['imported']} items imported, {len(seen_item_ids)} unique items seen")
            logger.info(f"  Total pages processed: {total_stats['pages_processed']}, Failed: {total_stats['pages_failed']}")
        
        # Deactivate items not in current inventory
        logger.info("")
        logger.info("=" * 60)
        logger.info("Deactivating items not in current inventory...")
        logger.info("=" * 60)
        
        if all_item_ids:
            self.importer.deactivate_other_items(all_item_ids)
            total_stats['current_item_ids'] = all_item_ids
        else:
            logger.warning("No item IDs collected - skipping deactivation")
        
        logger.info("=" * 60)
        logger.info("Complete scrape finished!")
        logger.info("=" * 60)
        
        return total_stats
    
    def scrape_all_pages(self) -> Dict[str, any]:
        """
        Scrape all pages of inventory for a single category (legacy method).
        
        Returns:
            Dictionary with statistics about the scrape
        """
        logger.info("=" * 60)
        logger.info("Starting Costco inventory scrape (single category)")
        logger.info("=" * 60)
        
        seen_item_ids: Set[str] = set()
        
        # Fetch first page to get total count
        logger.info("Fetching first page to determine total items...")
        first_page_data = self.fetch_page(0)
        
        if not first_page_data:
            logger.error("Failed to fetch first page. Aborting.")
            return {
                'success': False,
                'total_pages': 0,
                'total_items': 0,
                'imported': 0,
                'failed': 0,
                'errors': ['Failed to fetch first page']
            }
        
        response = first_page_data.get('response', {})
        total_found = response.get('numFound', 0)
        num_found_exact = response.get('numFoundExact', True)
        
        logger.info(f"Total items found: {total_found} (exact: {num_found_exact})")
        
        if total_found == 0:
            logger.warning("No items found for this location.")
            return {
                'success': True,
                'total_pages': 0,
                'total_items': 0,
                'imported': 0,
                'failed': 0,
                'errors': []
            }
        
        # Calculate total pages
        total_pages = (total_found + self.rows - 1) // self.rows  # Ceiling division
        logger.info(f"Total pages to scrape: {total_pages} (rows per page: {self.rows})")
        
        # Import first page
        all_item_ids: Set[str] = set()
        stats = {
            'success': True,
            'total_pages': total_pages,
            'total_items': total_found,
            'imported': 0,
            'failed': 0,
            'errors': [],
            'pages_processed': 0,
            'pages_failed': 0
        }
        
        # Process first page
        items = response.get('docs', [])
        filtered_items = self.filter_items_for_location(items, seen_item_ids)
        
        logger.info(f"Page 1/{total_pages}: {len(items)} items received, {len(filtered_items)} match location")
        
        if filtered_items:
            page_stats = self.importer.import_from_api_response({
                'response': {
                    'docs': filtered_items,
                    'numFound': len(filtered_items)
                }
            })
            
            stats['imported'] += page_stats.get('imported', 0)
            stats['failed'] += page_stats.get('failed', 0)
            stats['errors'].extend(page_stats.get('errors', []))
            
            # Collect item IDs
            for item in filtered_items:
                item_id = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', ''))
                if item_id:
                    all_item_ids.add(item_id)
        
        stats['pages_processed'] = 1
        
        # Process remaining pages
        for page in range(1, total_pages):
            start = page * self.rows
            
            # Rate limiting with random variance to avoid detection
            if self.delay > 0:
                delay = self._get_random_delay()
                logger.debug(f"Waiting {delay:.2f}s before next request...")
                time.sleep(delay)
            
            logger.info(f"Page {page + 1}/{total_pages}: Fetching items {start} to {start + self.rows - 1}...")
            
            page_data = self.fetch_page(start)
            
            if not page_data:
                logger.warning(f"Failed to fetch page {page + 1}, skipping...")
                stats['pages_failed'] += 1
                continue
            
            response = page_data.get('response', {})
            items = response.get('docs', [])
            filtered_items = self.filter_items_for_location(items, seen_item_ids)
            
            logger.info(f"  {len(items)} items received, {len(filtered_items)} match location")
            
            if not filtered_items:
                logger.debug(f"  No items for location {self.location_number} on this page")
                stats['pages_processed'] += 1
                continue
            
            # Import this page
            page_stats = self.importer.import_from_api_response({
                'response': {
                    'docs': filtered_items,
                    'numFound': len(filtered_items)
                }
            })
            
            stats['imported'] += page_stats.get('imported', 0)
            stats['failed'] += page_stats.get('failed', 0)
            stats['errors'].extend(page_stats.get('errors', []))
            
            # Collect item IDs
            for item in filtered_items:
                item_id = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', ''))
                if item_id:
                    all_item_ids.add(item_id)
            
            stats['pages_processed'] += 1
            
            # Progress update every 10 pages
            if (page + 1) % 10 == 0:
                logger.info(f"Progress: {page + 1}/{total_pages} pages processed, {stats['imported']} items imported")
        
        # Deactivate items not in current inventory
        logger.info("=" * 60)
        logger.info("Deactivating items not in current inventory...")
        logger.info("=" * 60)
        
        if all_item_ids:
            self.importer.deactivate_other_items(all_item_ids)
            stats['current_item_ids'] = all_item_ids
        else:
            logger.warning("No item IDs collected - skipping deactivation")
        
        logger.info("=" * 60)
        logger.info("Scrape complete!")
        logger.info("=" * 60)
        
        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Dynamically scrape Costco warehouse inventory',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 costco_dynamic_scraper.py --location-number 681-wh
  python3 costco_dynamic_scraper.py --location-number 681-wh --rows 50 --delay 2.0
  python3 costco_dynamic_scraper.py --location-number 681-wh --category-url /snacks.html
        """
    )
    
    parser.add_argument(
        '--location-number',
        required=True,
        help='Costco warehouse location number (e.g., 681-wh)'
    )
    
    parser.add_argument(
        '--rows',
        type=int,
        default=CostcoDynamicScraper.DEFAULT_ROWS,
        help=f'Number of items per page (default: {CostcoDynamicScraper.DEFAULT_ROWS})'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=CostcoDynamicScraper.DEFAULT_DELAY,
        help=f'Base delay between requests in seconds (default: {CostcoDynamicScraper.DEFAULT_DELAY})'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=CostcoDynamicScraper.DEFAULT_DELAY_VARIANCE,
        help=f'Random variance in delay in seconds (default: {CostcoDynamicScraper.DEFAULT_DELAY_VARIANCE})'
    )
    
    parser.add_argument(
        '--category-url',
        default='/grocery-household.html',
        help='Category URL to filter by (default: /grocery-household.html)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable debug logging'
    )
    
    parser.add_argument(
        '--all-categories',
        action='store_true',
        help='Scrape all grocery categories and subcategories (default: single category only)'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Allow override via environment variable
    location_number = args.location_number or os.getenv('COSTCO_LOCATION_NUMBER')
    
    if not location_number:
        logger.error("Location number is required (--location-number or COSTCO_LOCATION_NUMBER env var)")
        sys.exit(1)
    
    # Initialize scraper
    scraper = CostcoDynamicScraper(
        location_number=location_number,
        rows=args.rows,
        delay=args.delay,
        delay_variance=args.delay_variance,
        category_url=args.category_url
    )
    
    # Run appropriate scrape method
    if args.all_categories:
        stats = scraper.scrape_all_categories()
    else:
        stats = scraper.scrape_all_pages()
    
    # Print summary
    print("\n" + "=" * 60)
    print("SCRAPE SUMMARY")
    print("=" * 60)
    print(f"Location: {location_number}")
    
    if args.all_categories:
        print(f"Total categories: {stats.get('total_categories', 0)}")
        print(f"Categories processed: {stats.get('categories_processed', 0)}")
        print(f"Categories failed: {stats.get('categories_failed', 0)}")
    
    print(f"Total pages: {stats.get('total_pages', 0)}")
    print(f"Pages processed: {stats.get('pages_processed', 0)}")
    print(f"Pages failed: {stats.get('pages_failed', 0)}")
    print(f"Total items found: {stats.get('total_items', 0)}")
    print(f"Items imported: {stats.get('imported', 0)}")
    print(f"Items failed: {stats.get('failed', 0)}")
    
    if stats.get('errors'):
        print(f"\nFirst 10 errors:")
        for error in stats['errors'][:10]:
            print(f"  - {error}")
    
    print("=" * 60)
    
    if not stats.get('success', False):
        sys.exit(1)


if __name__ == '__main__':
    main()

