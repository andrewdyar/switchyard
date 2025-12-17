#!/usr/bin/env python3
"""
Costco product scraper for warehouse locations.

This script:
- Makes paginated requests to Costco's Fusion API search endpoint
- Filters for InWarehouse items only
- Handles pagination automatically
- Updates Supabase database with location-specific inventory
- Deactivates items no longer in inventory
- Filters to grocery categories only

Usage:
    python3 scrapers/costco_scraper.py --location-number 681-wh
    python3 scrapers/costco_scraper.py --location-number 681-wh --rows 50 --delay 2.0
"""

import argparse
import logging
import os
import random
import sys
import time
from typing import Dict, List, Optional, Set, Any
from urllib.parse import urlencode

import requests
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

from import_costco_fusion_api import CostcoFusionAPIImporter
from core.base_scraper import BaseScraper

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CostcoScraper(BaseScraper):
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
        category_url: str = "/grocery-household.html",
        dry_run: bool = False,
        max_items: Optional[int] = None
    ):
        """
        Initialize the scraper.
        
        Args:
            location_number: Costco warehouse location number (e.g., "681-wh")
            rows: Number of items per page (default: 24)
            delay: Delay between requests in seconds (default: 1.0)
            delay_variance: Random variance in delay (seconds)
            category_url: Category URL to filter by (default: "/grocery-household.html")
            dry_run: If True, skip Supabase storage and only log products
            max_items: Maximum items to scrape (None = no limit)
        """
        # Initialize base scraper
        super().__init__(
            retailer_name='costco',
            store_id=location_number,
            dry_run=dry_run,
            rate_limit_delay=delay,
            rate_limit_variance=delay_variance,
            max_items=max_items
        )
        
        # Costco-specific initialization
        self.location_number = location_number
        self.rows = rows
        self.category_url = category_url
        # Note: delay and delay_variance are now rate_limit_delay and rate_limit_variance (from BaseScraper)
        
        # Initialize importer (handles location-specific storage)
        if not dry_run:
            self.importer = CostcoFusionAPIImporter(location_number=location_number)
        else:
            self.importer = None
        
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
        
        logger.info(f"Initialized Costco scraper for location: {location_number}")
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
    
    # _get_random_delay is inherited from BaseScraper, but Costco needs a minimum delay
    def _get_random_delay(self) -> float:
        """Get random delay with variance for rate limiting (Costco-specific minimum)."""
        variance = random.uniform(-self.rate_limit_variance, self.rate_limit_variance)
        delay = max(0.5, self.rate_limit_delay + variance)  # Minimum 0.5 seconds for Costco
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
                wait_time = self.rate_limit_delay * 5 + random.uniform(2, 5)
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
    
    def extract_categories_from_facets(self, data: Dict) -> List[Dict[str, Any]]:
        """
        Extract category URLs from API response facets.
        
        Args:
            data: API response JSON dict
            
        Returns:
            List of category dicts with 'url', 'name', 'count', and 'parent' keys
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
                
                # Determine parent and subcategory
                if len(name_parts) >= 3:
                    # Has parent category (e.g., "Grocery & Household Essentials" -> "Snacks")
                    parent_name = name_parts[-2]
                    category_name = name_parts[-1]
                    parent = parent_name
                elif len(name_parts) == 2:
                    # Top-level category
                    category_name = name_parts[-1]
                    parent = None
                else:
                    category_name = val
                    parent = None
                
                categories.append({
                    'url': meta,
                    'name': category_name,
                    'parent': parent,
                    'count': bucket.get('count', 0)
                })
        
        return categories
    
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover product categories from Costco API facets.
        
        Returns:
            List of category dictionaries with name, url, parent, and count fields.
            Categories are filtered to grocery-only in the base class.
        """
        logger.info("Discovering categories from Costco API facets...")
        
        # Fetch main grocery page to get all categories
        first_page_data = self.fetch_page(0, '/grocery-household.html')
        
        if not first_page_data:
            logger.error("Failed to fetch main grocery page for category discovery")
            return []
        
        # Extract categories from facets
        categories = self.extract_categories_from_facets(first_page_data)
        
        logger.info(f"Discovered {len(categories)} categories from facets")
        return categories
    
    def extract_product_data(self, product_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract normalized product data from Costco API response.
        
        Args:
            product_data: Raw product data from Costco API (item dict)
            
        Returns:
            Normalized product dictionary with required fields
        """
        try:
            item_id = str(product_data.get('item_number', '')) or str(product_data.get('item_location_itemNumber', ''))
            if not item_id:
                return None
            
            # Skip if already processed
            if item_id in self.discovered_product_ids:
                return None
            
            name = product_data.get('item_product_name', '').strip() or product_data.get('item_name', '').strip() or product_data.get('name', '').strip()
            if not name:
                return None
            
            # Extract category information
            category_paths = product_data.get('categoryPath_ss', [])
            category_name = None
            parent_category = None
            
            if category_paths:
                # Get the most specific category (last in path)
                paths = [p for p in category_paths if p and p != '/']
                if paths:
                    # Extract category name from path (e.g., "/snacks.html" -> "Snacks")
                    last_path = paths[-1]
                    category_name = last_path.replace('.html', '').replace('/', '').replace('-', ' ').title()
                    
                    # Get parent if available
                    if len(paths) >= 2:
                        parent_path = paths[-2]
                        parent_category = parent_path.replace('.html', '').replace('/', '').replace('-', ' ').title()
            
            # Extract UPC
            manufacturing_skus = product_data.get('item_manufacturing_skus', [])
            upc = None
            if manufacturing_skus and len(manufacturing_skus) > 0:
                upc_str = str(manufacturing_skus[0]).strip()
                # Handle GTIN-14 by stripping first 2 digits if needed
                if len(upc_str) == 14:
                    upc = upc_str[2:]  # Strip first 2 digits to get UPC-12
                elif len(upc_str) == 12:
                    upc = upc_str
                else:
                    upc = upc_str
            
            # Extract image
            image_url = product_data.get('item_collateral_primaryimage') or product_data.get('image') or ''
            
            # Extract size/unit of measure
            container_sizes = product_data.get('Container_Size_attr', [])
            size = None
            if container_sizes:
                size = str(container_sizes[0])
            
            return {
                'product_id': item_id,
                'name': name,
                'image_url': image_url,
                'upc': upc,
                'size': size,
                'category_name': category_name or 'Uncategorized',
                'parent_category': parent_category,
                'raw_data': product_data,
                'location_number': self.location_number
            }
            
        except Exception as e:
            logger.error(f"Error extracting product data: {e}")
            return None
    
    def scrape_category(self, category: Dict[str, Any]) -> int:
        """
        Scrape all pages for a specific category.
        
        Args:
            category: Category dictionary from discover_categories()
            
        Returns:
            Number of products scraped
        """
        category_url = category.get('url', '')
        category_name = category.get('name', 'Unknown')
        
        logger.info(f"Scraping category: {category_name} ({category_url})")
        
        # Track seen item IDs for this category (to avoid duplicates)
        seen_item_ids: Set[str] = set()
        category_scraped = 0
        
        # Fetch first page to get total count
        first_page_data = self.fetch_page(0, category_url)
        
        if not first_page_data:
            logger.warning(f"Failed to fetch first page for {category_url}, skipping...")
            return 0
        
        response = first_page_data.get('response', {})
        total_found = response.get('numFound', 0)
        
        if total_found == 0:
            logger.debug(f"No items found for category {category_url}")
            return 0
        
        # Calculate total pages
        total_pages = (total_found + self.rows - 1) // self.rows
        logger.info(f"  Category has {total_found} items across {total_pages} pages")
        
        # Process first page
        items = response.get('docs', [])
        filtered_items = self.filter_items_for_location(items, seen_item_ids)
        
        logger.info(f"  Page 1/{total_pages}: {len(items)} items received, {len(filtered_items)} new items for location")
        
        # Process products from first page
        for item in filtered_items:
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                return category_scraped
            
            product = self.extract_product_data(item)
            if product:
                # Use Costco importer for storage (handles location-specific logic)
                if not self.dry_run and self.importer:
                    try:
                        # Import using Costco importer (handles location-specific storage)
                        import_stats = self.importer.import_from_api_response({
                            'response': {
                                'docs': [item],
                                'numFound': 1
                            }
                        })
                        if import_stats.get('imported', 0) > 0:
                            category_scraped += 1
                            self.scraped_count += 1
                        else:
                            self.failed_count += 1
                    except Exception as e:
                        logger.error(f"  Error storing product {product.get('product_id')}: {e}")
                        self.failed_count += 1
                else:
                    # Dry run - just count
                    category_scraped += 1
                    self.scraped_count += 1
        
        # Process remaining pages
        for page in range(1, total_pages):
            start = page * self.rows
            
            # Rate limiting with random variance
            delay = self._get_random_delay()
            logger.debug(f"  Waiting {delay:.2f}s before page {page + 1}...")
            time.sleep(delay)
            
            logger.info(f"  Page {page + 1}/{total_pages}: Fetching items {start} to {start + self.rows - 1}...")
            
            try:
                page_data = self.fetch_page(start, category_url)
                
                if not page_data:
                    logger.warning(f"  Failed to fetch page {page + 1} for {category_url}, skipping...")
                    continue
                
                response = page_data.get('response', {})
                items = response.get('docs', [])
                filtered_items = self.filter_items_for_location(items, seen_item_ids)
                
                logger.info(f"    {len(items)} items received, {len(filtered_items)} new items")
                
                if not filtered_items:
                    continue
                
                # Process products from this page
                for item in filtered_items:
                    if self.max_items and self.scraped_count >= self.max_items:
                        logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                        break
                    
                    product = self.extract_product_data(item)
                    if product:
                        # Use Costco importer for storage (handles location-specific logic)
                        if not self.dry_run and self.importer:
                            try:
                                # Import using Costco importer
                                import_stats = self.importer.import_from_api_response({
                                    'response': {
                                        'docs': [item],
                                        'numFound': 1
                                    }
                                })
                                if import_stats.get('imported', 0) > 0:
                                    category_scraped += 1
                                    self.scraped_count += 1
                                else:
                                    self.failed_count += 1
                            except Exception as e:
                                logger.error(f"    Error storing product {product.get('product_id')}: {e}")
                                self.failed_count += 1
                        else:
                            # Dry run - just count
                            category_scraped += 1
                            self.scraped_count += 1
                
                # Progress update every 5 pages
                if (page + 1) % 5 == 0:
                    logger.info(f"    Progress: {page + 1}/{total_pages} pages, {category_scraped} items scraped so far")
                    
            except Exception as e:
                logger.error(f"  Exception on page {page + 1}: {e}")
                continue
        
        logger.info(f"  Category complete: {category_scraped} items scraped")
        return category_scraped
    
    def scrape_all_categories(self) -> Dict[str, Any]:
        """
        Scrape all grocery categories and subcategories for the location.
        Uses BaseScraper's run method structure.
        
        Returns:
            Dictionary with statistics about the complete scrape
        """
        # Use BaseScraper's run method which handles category discovery and filtering
        stats = self.run(strategy='categories')
        
        # Deactivate items not in current inventory (Costco-specific)
        if not self.dry_run and self.importer and self.discovered_product_ids:
            logger.info("")
            logger.info("=" * 60)
            logger.info("Deactivating items not in current inventory...")
            logger.info("=" * 60)
            self.importer.deactivate_other_items(self.discovered_product_ids)
        
        return {
            'success': True,
            'scraped': stats['scraped'],
            'failed': stats['failed'],
            'elapsed_seconds': stats['elapsed_seconds']
        }
    
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
        
        # Process products from first page
        for item in filtered_items:
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                break
            
            product = self.extract_product_data(item)
            if product:
                # Use Costco importer for storage (handles location-specific logic)
                if not self.dry_run and self.importer:
                    try:
                        # Import using Costco importer
                        import_stats = self.importer.import_from_api_response({
                            'response': {
                                'docs': [item],
                                'numFound': 1
                            }
                        })
                        if import_stats.get('imported', 0) > 0:
                            stats['imported'] += 1
                            self.scraped_count += 1
                        else:
                            stats['failed'] += 1
                            self.failed_count += 1
                    except Exception as e:
                        logger.error(f"  Error storing product {product.get('product_id')}: {e}")
                        stats['failed'] += 1
                        self.failed_count += 1
                else:
                    # Dry run - just count
                    logger.info(f"  [DRY-RUN] Would store product: {product.get('name', 'Unknown')} (ID: {product.get('product_id')})")
                    stats['imported'] += 1
                    self.scraped_count += 1
                
                # Collect item IDs
                item_id = product.get('product_id')
                if item_id:
                    all_item_ids.add(item_id)
        
        stats['pages_processed'] = 1
        
        # Process remaining pages
        for page in range(1, total_pages):
            start = page * self.rows
            
            # Rate limiting with random variance to avoid detection
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
            
            # Process products from this page
            for item in filtered_items:
                if self.max_items and self.scraped_count >= self.max_items:
                    logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                    break
                
                product = self.extract_product_data(item)
                if product:
                    # Use Costco importer for storage (handles location-specific logic)
                    if not self.dry_run and self.importer:
                        try:
                            # Import using Costco importer
                            import_stats = self.importer.import_from_api_response({
                                'response': {
                                    'docs': [item],
                                    'numFound': 1
                                }
                            })
                            if import_stats.get('imported', 0) > 0:
                                stats['imported'] += 1
                                self.scraped_count += 1
                            else:
                                stats['failed'] += 1
                                self.failed_count += 1
                        except Exception as e:
                            logger.error(f"    Error storing product {product.get('product_id')}: {e}")
                            stats['failed'] += 1
                            self.failed_count += 1
                    else:
                        # Dry run - just count
                        logger.info(f"    [DRY-RUN] Would store product: {product.get('name', 'Unknown')} (ID: {product.get('product_id')})")
                        stats['imported'] += 1
                        self.scraped_count += 1
                    
                    # Collect item IDs
                    item_id = product.get('product_id')
                    if item_id:
                        all_item_ids.add(item_id)
            
            stats['pages_processed'] += 1
            
            # Progress update every 10 pages
            if (page + 1) % 10 == 0:
                logger.info(f"Progress: {page + 1}/{total_pages} pages processed, {stats['imported']} items imported")
        
        # Deactivate items not in current inventory
        if not self.dry_run and self.importer and all_item_ids:
            logger.info("=" * 60)
            logger.info("Deactivating items not in current inventory...")
            logger.info("=" * 60)
            self.importer.deactivate_other_items(all_item_ids)
            stats['current_item_ids'] = all_item_ids
        elif all_item_ids:
            logger.info(f"[DRY-RUN] Would deactivate items not in current inventory ({len(all_item_ids)} items found)")
        
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
  python3 scrapers/costco_scraper.py --location-number 681-wh
  python3 scrapers/costco_scraper.py --location-number 681-wh --rows 50 --delay 2.0
  python3 scrapers/costco_scraper.py --location-number 681-wh --category-url /snacks.html
  python3 scrapers/costco_scraper.py --location-number 681-wh --all-categories
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
        default=CostcoScraper.DEFAULT_ROWS,
        help=f'Number of items per page (default: {CostcoScraper.DEFAULT_ROWS})'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=CostcoScraper.DEFAULT_DELAY,
        help=f'Base delay between requests in seconds (default: {CostcoScraper.DEFAULT_DELAY})'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=CostcoScraper.DEFAULT_DELAY_VARIANCE,
        help=f'Random variance in delay in seconds (default: {CostcoScraper.DEFAULT_DELAY_VARIANCE})'
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
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without saving to database (useful for testing)'
    )
    
    parser.add_argument(
        '--max-items',
        type=int,
        help='Maximum number of items to scrape (useful for testing)'
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
    scraper = CostcoScraper(
        location_number=location_number,
        rows=args.rows,
        delay=args.delay,
        delay_variance=args.delay_variance,
        category_url=args.category_url,
        dry_run=args.dry_run if hasattr(args, 'dry_run') else False,
        max_items=args.max_items if hasattr(args, 'max_items') else None
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
        # New format from scrape_all_categories
        print(f"Items scraped: {stats.get('scraped', 0)}")
        print(f"Items failed: {stats.get('failed', 0)}")
        print(f"Elapsed time: {stats.get('elapsed_seconds', 0):.2f} seconds")
    else:
        # Legacy format from scrape_all_pages
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
    
    if not stats.get('success', True):
        sys.exit(1)


if __name__ == '__main__':
    main()

