#!/usr/bin/env python3
"""
Whole Foods product scraper with HTML parsing and PDP enrichment.

This scraper:
- Scrapes products from Whole Foods HTML pages (category + PDP)
- Extracts data from embedded __NEXT_DATA__ JSON on PDP pages
- Converts ASINs to UPCs via RocketSource API
- Stores products in Supabase database with full metadata
- Follows Trader Joe's scraper architecture for consistency

Usage:
    python3 scrapers/whole_foods_scraper.py --no-dry-run
    python3 scrapers/whole_foods_scraper.py --max-items 100
"""

import argparse
import json
import logging
import os
import re
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple, Set
import requests
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("BeautifulSoup4 is required. Install with: pip install beautifulsoup4")
    sys.exit(1)

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.base_scraper import BaseScraper
from core.category_mapping import WHOLEFOODS_CATEGORY_MAP, normalize_category, should_include_category

# Configure logging with file handler for remote execution
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, f'whole_foods_scrape_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file)
    ]
)
logger = logging.getLogger(__name__)
logger.info(f"Logging to: {log_file}")


# Category URL slugs for Whole Foods (verified working categories)
CATEGORY_SLUGS = {
    'Produce': 'produce',
    'Dairy & Eggs': 'dairy-eggs',
    'Prepared Foods': 'prepared-foods',
    'Frozen Foods': 'frozen-foods',
    'Meat': 'meat',
    'Seafood': 'seafood',
    'Snacks, Chips, Salsas & Dips': 'snacks-chips-salsas-dips',
    'Pantry Essentials': 'pantry-essentials',
    'Beverages': 'beverages',
    'Beauty': 'beauty',
    'Household': 'household',
}


class RocketSourceClient:
    """Client for RocketSource ASIN-to-UPC conversion API."""
    
    BASE_URL = "https://app.rocketsource.io"
    
    def __init__(self, api_token: str):
        """
        Initialize the RocketSource client.
        
        Args:
            api_token: RocketSource API token (Bearer token)
        """
        self.api_token = api_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
        })
        
        # Cache for ASIN-to-UPC mappings
        self._cache: Dict[str, Optional[str]] = {}
    
    def convert_asins(self, asins: List[str], marketplace: str = "US") -> Dict[str, Optional[str]]:
        """
        Convert ASINs to UPCs in batch.
        
        Args:
            asins: List of ASINs to convert (max 1000 per request)
            marketplace: Amazon marketplace (default: US)
            
        Returns:
            Dict mapping ASIN to UPC (None if no UPC found)
        """
        results = {}
        
        # Check cache first
        uncached_asins = []
        for asin in asins:
            if asin in self._cache:
                results[asin] = self._cache[asin]
            else:
                uncached_asins.append(asin)
        
        if not uncached_asins:
            return results
        
        # Batch in groups of 1000
        batch_size = 1000
        for i in range(0, len(uncached_asins), batch_size):
            batch = uncached_asins[i:i + batch_size]
            
            try:
                response = self.session.post(
                    f'{self.BASE_URL}/api/v3/asin-convert',
                    json={
                        'marketplace': marketplace,
                        'asins': batch
                    },
                    timeout=60
                )
                
                if response.status_code == 200:
                    data = response.json()
                    for asin in batch:
                        upc = None
                        if asin in data:
                            upc_list = data[asin].get('upc', [])
                            if upc_list:
                                upc = upc_list[0]  # Take first UPC
                        
                        results[asin] = upc
                        self._cache[asin] = upc
                else:
                    logger.warning(f"RocketSource API error {response.status_code}: {response.text}")
                    # Mark batch as failed (no UPC)
                    for asin in batch:
                        results[asin] = None
                        self._cache[asin] = None
            
            except Exception as e:
                logger.error(f"RocketSource API exception: {e}")
                for asin in batch:
                    results[asin] = None
                    self._cache[asin] = None
            
            # Rate limiting
            if i + batch_size < len(uncached_asins):
                time.sleep(1)
        
        return results
    
    def convert_single(self, asin: str, marketplace: str = "US") -> Optional[str]:
        """
        Convert a single ASIN to UPC.
        
        Args:
            asin: ASIN to convert
            marketplace: Amazon marketplace (default: US)
            
        Returns:
            UPC string or None if not found
        """
        result = self.convert_asins([asin], marketplace)
        return result.get(asin)


class WholeFoodsHTMLClient:
    """HTTP client for Whole Foods HTML pages."""
    
    BASE_URL = "https://www.wholefoodsmarket.com"
    GROCERY_URL = f"{BASE_URL}/products"
    
    # Default store ID - Whole Foods Market, Third & Fairfax, Los Angeles
    # Can be changed via --store-id parameter
    DEFAULT_STORE_ID = "10225"
    
    def __init__(self, cookies: Optional[str] = None, store_id: Optional[str] = None):
        """
        Initialize the HTML client.
        
        Args:
            cookies: Optional cookie string from browser
            store_id: Store ID for location-specific pricing (required for prices!)
        """
        self.session = requests.Session()
        self.store_id = store_id or self.DEFAULT_STORE_ID
        logger.info(f"Using store ID: {self.store_id} for location-specific pricing")
        
        # Setup retry strategy - keep retries minimal to avoid long hangs
        retry_strategy = Retry(
            total=1,  # Only 1 retry (2 attempts total)
            backoff_factor=0.5,  # Short backoff
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set headers to match actual browser request
        self.session.headers.update({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'dnt': '1',
            'pragma': 'no-cache',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'sec-gpc': '1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        })
        
        # Set cookies if provided
        if cookies:
            self._set_cookies_from_string(cookies)
        # Note: Session establishment skipped - will happen on first request if needed
    
    def _set_cookies_from_string(self, cookie_string: str):
        """Parse and set cookies from a cookie string."""
        cookie_jar = requests.cookies.RequestsCookieJar()
        
        for cookie in cookie_string.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                cookie_jar.set(key.strip(), value.strip(), domain='.wholefoodsmarket.com', path='/')
        
        self.session.cookies.update(cookie_jar)
        logger.debug(f"Set {len(cookie_jar)} cookies from provided string")
    
    def _establish_session(self):
        """Establish a session by visiting the homepage to get cookies."""
        try:
            logger.debug("Establishing session with Whole Foods...")
            
            response = self.session.get(self.BASE_URL, timeout=10, allow_redirects=True)  # Reduced timeout
            response.raise_for_status()
            
            logger.debug(f"Session established - got {len(self.session.cookies)} cookies")
            
        except requests.exceptions.Timeout:
            logger.warning("Session establishment timed out (continuing anyway)")
        except Exception as e:
            logger.warning(f"Session establishment failed (continuing anyway): {e}")
    
    def fetch_category_page(self, category_slug: str, offset: int = 0) -> Optional[str]:
        """
        Fetch a category listing page using offset-based pagination.
        
        Args:
            category_slug: URL slug for category (e.g., 'produce', 'dairy-eggs')
            offset: Offset for pagination (0-based, increments of 60)
            
        Returns:
            HTML content or None on error
        """
        # Build URL with offset-based pagination and store ID (required for pricing!)
        url = f"{self.GROCERY_URL}/{category_slug}"
        params = {
            'store': self.store_id,  # Store ID required for prices
            'offset': offset
        }
        
        try:
            response = self.session.get(url, params=params, timeout=15)
            response.raise_for_status()
            return response.text
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout fetching category page {category_slug} (offset {offset})")
            return None
        except Exception as e:
            logger.error(f"Error fetching category page {category_slug} (offset {offset}): {e}")
            return None
    
    def fetch_pdp_page(self, product_slug: str, timeout: int = 8) -> Optional[str]:
        """
        Fetch a product detail page.
        
        Uses a fresh request (not session) to avoid rate limiting issues.
        
        Args:
            product_slug: Product slug (e.g., 'produce-organic-english-cucumbers-b07dlgkrtd')
            timeout: Request timeout in seconds (default 8s)
            
        Returns:
            HTML content or None on error
        """
        # Build PDP URL with store ID for pricing
        url = f"{self.BASE_URL}/product/{product_slug}"
        params = {'store': self.store_id}
        
        # Use simple headers to avoid bot detection
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        try:
            # Use direct request instead of session to avoid rate limiting
            response = requests.get(url, params=params, headers=headers, timeout=timeout)
            response.raise_for_status()
            return response.text
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout fetching PDP for {product_slug}")
            return None
        except Exception as e:
            logger.error(f"Error fetching PDP for {product_slug}: {e}")
            return None
    
    def parse_next_data(self, html: str) -> Optional[Dict[str, Any]]:
        """
        Extract __NEXT_DATA__ JSON from HTML.
        
        Args:
            html: HTML content
            
        Returns:
            Parsed JSON data or None if not found
        """
        try:
            soup = BeautifulSoup(html, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            
            if script and script.string:
                return json.loads(script.string)
            
            return None
        except Exception as e:
            logger.error(f"Error parsing __NEXT_DATA__: {e}")
            return None
    
    def extract_products_from_category_html(self, html: str) -> List[Dict[str, Any]]:
        """
        Extract basic product data from category page HTML.
        
        Whole Foods uses __NEXT_DATA__ JSON embedded in the page.
        Products are in pageProps.data.results array.
        
        Args:
            html: HTML content of category page
            
        Returns:
            List of basic product dicts (asin, name, slug, image_url, brand)
        """
        products = []
        
        try:
            # Parse __NEXT_DATA__ JSON from page
            next_data = self.parse_next_data(html)
            
            if not next_data:
                logger.warning("No __NEXT_DATA__ found in category page")
                return []
            
            # Navigate to results array
            page_props = next_data.get('props', {}).get('pageProps', {})
            data = page_props.get('data', {})
            results = data.get('results', [])
            
            logger.debug(f"Found {len(results)} products in category page __NEXT_DATA__")
            
            for item in results:
                # Extract ASIN from slug (e.g., "produce-organic-english-cucumbers-b07dlgkrtd")
                slug = item.get('slug', '')
                asin = None
                wf_id = None
                
                # Try regex pattern first (more reliable)
                if slug:
                    asin_match = re.search(r'-([B][0-9A-Z]{9})$', slug, re.IGNORECASE)
                    if asin_match:
                        asin = asin_match.group(1).upper()
                
                # Fallback to simple extraction if regex didn't match
                if not asin and slug:
                    parts = slug.split('-')
                    if parts:
                        potential_asin = parts[-1].upper()
                        # ASINs are 10 chars, start with B followed by digit
                        if len(potential_asin) == 10 and potential_asin.startswith('B') and potential_asin[1].isdigit():
                            asin = potential_asin
                
                # If no ASIN, try to extract Whole Foods ID from slug
                # IDs are typically numeric strings at the end (e.g., "1ob60198" -> "60504933672" in PDP)
                # We'll get the actual ID from PDP, but store the slug suffix for now
                if not asin and slug:
                    parts = slug.split('-')
                    if parts:
                        # Store the suffix - we'll get the actual ID from PDP
                        slug_suffix = parts[-1]
                        # Mark that we need to get ID from PDP
                        wf_id = slug_suffix
                
                # Skip if no identifier at all
                if not asin and not wf_id:
                    continue
                
                # Skip if already processed (by ASIN or by slug if no ASIN)
                identifier = asin or slug
                if identifier in [p.get('asin') or p.get('slug') for p in products]:
                    continue
                
                product = {
                    'slug': slug,
                    'name': item.get('name', ''),
                    'brand': item.get('brand', ''),
                    'image_url': item.get('imageThumbnail', ''),
                    'store_id': item.get('store'),
                    # Pricing (only available with store parameter!)
                    'regular_price': item.get('regularPrice'),
                    'sale_price': item.get('salePrice'),
                    'incremental_sale_price': item.get('incrementalSalePrice'),
                    'sale_start_date': item.get('saleStartDate'),
                    'sale_end_date': item.get('saleEndDate'),
                    'is_local': item.get('isLocal', False),
                }
                
                # Add ASIN if available, otherwise mark for ID extraction from PDP
                if asin:
                    product['asin'] = asin
                else:
                    product['needs_wf_id'] = True  # Flag to extract ID from PDP
                
                if product.get('name'):
                    products.append(product)
            
            logger.debug(f"Extracted {len(products)} products from category HTML")
            return products
            
        except Exception as e:
            logger.error(f"Error extracting products from category HTML: {e}")
            return []
    
    def extract_pdp_data(self, html: str) -> Optional[Dict[str, Any]]:
        """
        Extract full product data from PDP page HTML.
        
        Whole Foods PDP pages have product data in pageProps.data
        
        Structure includes:
        - name, asin, id, store
        - brand: {name, slug}
        - categories: {name, slug, childCategory: {...}}
        - images: [{thumbnail, image, image2x}]
        - ingredients, certifications, diets
        - nutritionElements, servingInfo
        
        Args:
            html: HTML content of PDP page
            
        Returns:
            Full product data dict or None if extraction failed
        """
        try:
            next_data = self.parse_next_data(html)
            
            if not next_data:
                logger.warning("No __NEXT_DATA__ found in PDP page")
                return None
            
            # Navigate to product data - it's in pageProps.data
            page_props = next_data.get('props', {}).get('pageProps', {})
            product_data = page_props.get('data', {})
            
            if not product_data:
                logger.warning("No product data found in pageProps.data")
                return None
            
            # Verify we have essential fields
            if not product_data.get('name') and not product_data.get('asin'):
                logger.warning("Product data missing name and asin")
                return None
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error extracting PDP data: {e}")
            return None


class WholeFoodsScraper(BaseScraper):
    """Whole Foods product scraper."""
    
    DEFAULT_DELAY = 0.3  # Reduced from 1.5s for faster scraping
    DEFAULT_DELAY_VARIANCE = 0.2  # Reduced from 0.5s
    DEFAULT_PAGE_SIZE = 48  # Products per category page
    DEFAULT_MAX_WORKERS = 20  # Parallel PDP requests (optimized for ~100 products/minute)
    
    def __init__(
        self,
        store_id: Optional[str] = None,
        cookies: Optional[str] = None,
        rocketsource_token: Optional[str] = None,
        dry_run: bool = False,
        rate_limit_delay: float = DEFAULT_DELAY,
        rate_limit_variance: float = DEFAULT_DELAY_VARIANCE,
        max_items: Optional[int] = None,
        skip_upc_conversion: bool = False,
        max_workers: int = DEFAULT_MAX_WORKERS
    ):
        """
        Initialize the Whole Foods scraper.
        
        Args:
            store_id: Whole Foods store ID (optional)
            cookies: Cookie string from browser (optional)
            rocketsource_token: RocketSource API token for ASIN-to-UPC conversion
            dry_run: If True, skip Supabase storage
            rate_limit_delay: Base delay between requests
            rate_limit_variance: Random variance in delay
            max_items: Maximum items to scrape (None = no limit)
            skip_upc_conversion: If True, skip RocketSource API calls
        """
        # For category mapping, use 'whole_foods' key
        super().__init__(
            retailer_name='whole_foods',
            store_id=store_id,
            dry_run=dry_run,
            rate_limit_delay=rate_limit_delay,
            rate_limit_variance=rate_limit_variance,
            max_items=max_items
        )
        
        # Initialize HTTP client (skip in dry-run to avoid hanging on network requests)
        if not dry_run:
            self.client = WholeFoodsHTMLClient(cookies=cookies, store_id=store_id)
        else:
            # Create a minimal client for dry-run (won't make actual requests)
            self.client = None
            logger.info("Dry-run mode: HTTP client disabled to avoid network requests")
        
        # Initialize RocketSource client for ASIN-to-UPC conversion
        self.rocketsource = None
        self.skip_upc_conversion = skip_upc_conversion
        if rocketsource_token and not skip_upc_conversion:
            self.rocketsource = RocketSourceClient(rocketsource_token)
            logger.info("RocketSource API client initialized for ASIN-to-UPC conversion")
        elif not skip_upc_conversion:
            logger.warning("No RocketSource token provided - products will not have UPCs")
        
        # Tracking
        self.page_size = self.DEFAULT_PAGE_SIZE
        self.asin_to_upc_cache: Dict[str, Optional[str]] = {}  # For caching during session
        self.max_workers = max_workers  # Parallel PDP workers
    
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover categories for scraping.
        
        Returns:
            List of category dicts with name, slug, and subcategories
        """
        categories = []
        
        for parent_name, slug in CATEGORY_SLUGS.items():
            # Check if this parent category should be included
            if parent_name in WHOLEFOODS_CATEGORY_MAP:
                subcategories = list(WHOLEFOODS_CATEGORY_MAP[parent_name].keys())
                
                categories.append({
                    'name': parent_name,
                    'slug': slug,
                    'subcategories': subcategories
                })
                logger.debug(f"Added category: {parent_name} ({len(subcategories)} subcategories)")
        
        logger.info(f"Discovered {len(categories)} grocery categories")
        return categories
    
    def filter_grocery_categories(self, categories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter categories to only include grocery-related items.
        
        Args:
            categories: List of category dicts
            
        Returns:
            Filtered list of categories
        """
        filtered = []
        
        for cat in categories:
            parent_name = cat.get('name', '')
            
            # Check if parent category is in our mapping
            if parent_name in WHOLEFOODS_CATEGORY_MAP:
                filtered.append(cat)
        
        excluded_count = len(categories) - len(filtered)
        if excluded_count > 0:
            logger.info(f"Filtered {excluded_count} non-grocery categories")
        
        return filtered
    
    def scrape_category(self, category: Dict[str, Any]) -> int:
        """
        Scrape all products from a category.
        
        Args:
            category: Category dict with name and slug
            
        Returns:
            Number of products scraped
        """
        category_name = category.get('name', 'Unknown')
        category_slug = category.get('slug', '')
        
        logger.info(f"Scraping category: {category_name}")
        
        # In dry-run mode, skip actual HTTP requests and just log
        if self.dry_run or not self.client:
            logger.info(f"  [DRY-RUN] Would scrape category: {category_name} (slug: {category_slug})")
            logger.info(f"  [DRY-RUN] Would fetch category page: https://www.wholefoodsmarket.com/products/{category_slug}")
            logger.info(f"  [DRY-RUN] Skipping actual HTTP requests in dry-run mode")
            # Simulate finding a few products for testing
            logger.info(f"  [DRY-RUN] Would extract products from HTML")
            logger.info(f"  [DRY-RUN] Would process products and store in Supabase")
            return 0
        
        category_scraped = 0
        page_size = 60  # Whole Foods returns 60 products per page
        current_offset = 0
        max_offset = 10000  # Safety limit (should cover all categories)
        consecutive_empty_pages = 0  # Track empty pages to avoid infinite loops
        seen_product_slugs = set()  # Track products we've seen to detect pagination issues
        
        while current_offset < max_offset:
            # Check max items limit
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"Reached max items limit ({self.max_items})")
                break
            
            # Rate limiting
            time.sleep(self._get_random_delay())
            
            # Fetch category page using offset-based pagination
            page_num = (current_offset // page_size) + 1
            logger.debug(f"  Fetching offset {current_offset} (page {page_num})...")
            html = self.client.fetch_category_page(category_slug, offset=current_offset)
            
            if not html:
                consecutive_empty_pages += 1
                if consecutive_empty_pages >= 2:
                    logger.warning(f"  Failed to fetch {consecutive_empty_pages} consecutive pages - stopping category scrape")
                    break
                current_offset += page_size
                continue
            
            # Extract products from HTML
            products = self.client.extract_products_from_category_html(html)
            
            if not products:
                consecutive_empty_pages += 1
                if consecutive_empty_pages >= 2:
                    logger.info(f"  No products found on {consecutive_empty_pages} consecutive pages - category complete")
                    break
                current_offset += page_size
                continue
            
            # Found products - reset counter and process them
            consecutive_empty_pages = 0  # Reset on success
            logger.debug(f"  Found {len(products)} products at offset {current_offset} (page {page_num})")
            
            # Check for pagination issues - if we're seeing the same products, pagination isn't working
            new_product_slugs = {p.get('slug') for p in products if p.get('slug')}
            if new_product_slugs:
                if new_product_slugs.issubset(seen_product_slugs):
                    # All products on this page were already seen - pagination isn't working
                    logger.warning(f"  Offset {current_offset} contains only previously seen products - pagination may not be working for this category")
                    logger.info(f"  Stopping pagination after {len(seen_product_slugs)} unique products")
                    break
                seen_product_slugs.update(new_product_slugs)
            
            # Increment offset for next page
            current_offset += page_size
            
            # Add category info to all products
            for product_data in products:
                product_data['category_name'] = category_name
            
            # Enrich products with PDP data in parallel
            enriched_products = self._enrich_products_parallel(products)
            
            # Track products processed this batch
            products_with_asin = sum(1 for p in enriched_products if p.get('asin'))
            products_without_asin = len(enriched_products) - products_with_asin
            if products_without_asin > 0:
                logger.debug(f"  After PDP enrichment: {products_with_asin} with ASINs, {products_without_asin} without ASINs")
            
            # Process each enriched product
            for product_data in enriched_products:
                # Check max items
                if self.max_items and self.scraped_count >= self.max_items:
                    break
                
                # Extract full product data
                product = self.extract_product_data(product_data, category_name=category_name)
                
                if product:
                    if self.store_product_in_supabase(product):
                        self.scraped_count += 1
                        category_scraped += 1
                    else:
                        # Only count as failure if we actually tried to store it and it failed
                        # (store_product_in_supabase returns False on actual storage errors)
                        self.failed_count += 1
                        external_id = product.get('external_id', 'N/A')
                        logger.debug(f"Failed to store product: {product_data.get('name', 'Unknown')} (ID: {external_id})")
                else:
                    # extract_product_data returns None for valid skips (no identifier, duplicate, no name)
                    # Don't count these as failures - they're expected
                    external_id = product_data.get('asin') or product_data.get('wf_id', '')
                    if external_id and external_id not in self.discovered_product_ids:
                        # This is unexpected - we have an identifier but extract_product_data returned None
                        logger.warning(f"Unexpected: extract_product_data returned None for product with ID {external_id}")
                        self.failed_count += 1
                    # Otherwise, it's a valid skip - don't count as failure
            
            # Periodic progress report
            if category_scraped > 0 and category_scraped % 50 == 0:
                logger.info(f"  Progress: {category_scraped} items scraped so far in this category")
        
        logger.info(f"  Category complete: {category_scraped} items scraped")
        return category_scraped
    
    def _convert_missing_barcodes(self) -> None:
        """
        Convert ASINs to UPCs for products missing barcodes.
        
        This is credit-efficient:
        - Queries DB for Whole Foods products without barcodes
        - Batches up to 1000 ASINs per API call
        - Skips products that already have barcodes
        """
        if not self.rocketsource:
            logger.info("Skipping UPC conversion - no RocketSource token provided")
            return
        
        if self.dry_run:
            logger.info("Skipping UPC conversion in dry-run mode")
            return
        
        # Query database for Whole Foods products without barcodes
        logger.info("Querying database for Whole Foods products missing barcodes...")
        
        try:
            # Query source_products where:
            # - external_id looks like an ASIN (starts with B followed by alphanumeric)
            # - barcode is null
            result = self.supabase_client.table('source_products').select(
                'external_id'
            ).is_('barcode', 'null').like('external_id', 'B%').limit(1000).execute()
            
            if not result.data:
                logger.info("No products missing barcodes found")
                return
            
            # Extract ASINs
            asins = [row['external_id'] for row in result.data if row.get('external_id')]
            
            if not asins:
                logger.info("No ASINs found to convert")
                return
            
            logger.info(f"Found {len(asins)} products missing barcodes, converting ASINs to UPCs...")
            
            # Convert ASINs to UPCs (RocketSource batches internally up to 1000)
            upc_results = self.rocketsource.convert_asins(asins)
            
            # Count successes
            converted = sum(1 for upc in upc_results.values() if upc)
            logger.info(f"  RocketSource converted {converted}/{len(asins)} ASINs to UPCs")
            
            # Update database records with barcodes
            updated = 0
            for asin, upc in upc_results.items():
                if upc:
                    try:
                        self.supabase_client.table('source_products').update({
                            'barcode': upc
                        }).eq('external_id', asin).execute()
                        updated += 1
                    except Exception as e:
                        logger.warning(f"Failed to update barcode for ASIN {asin}: {e}")
            
            logger.info(f"  Updated {updated} products with barcodes in database")
            
        except Exception as e:
            logger.error(f"Error during barcode conversion: {e}", exc_info=True)
    
    def _enrich_products_parallel(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enrich multiple products with PDP data in parallel.
        
        Args:
            products: List of product dicts with basic data from category page
            
        Returns:
            List of enriched product dicts
        """
        if not products:
            return []
        
        # Skip if no client (dry run)
        if not self.client:
            return products
        
        enriched = []
        
        # Use ThreadPoolExecutor for parallel PDP fetching
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all PDP fetch tasks
            future_to_product = {
                executor.submit(self._enrich_with_pdp, product_data): product_data
                for product_data in products
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_product):
                product_data = future_to_product[future]
                try:
                    enriched_product = future.result()
                    enriched.append(enriched_product)
                except Exception as e:
                    logger.warning(f"Error enriching product {product_data.get('name', 'Unknown')}: {e}")
                    # Return original product data if enrichment fails
                    enriched.append(product_data)
        
        return enriched
    
    def _enrich_with_pdp(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich basic product data with PDP details.
        
        PDP provides REQUIRED fields not available in category pages:
        - categories (for category_id, subcategory_id mapping)
        - servingInfo (for size, size_uom)
        - ingredients
        - nutritionElements (nutrition facts)
        - diets (diet tags)
        - certifications
        - Multiple image sizes
        
        Args:
            product_data: Basic product dict with slug from category page
            
        Returns:
            Enriched product dict with PDP data
        """
        # Skip if no client (dry run) or no slug
        slug = product_data.get('slug')
        if not self.client or not slug:
            logger.debug(f"  Skipping PDP enrichment: client={bool(self.client)}, slug={bool(slug)}")
            return product_data
        
        # No delay needed for parallel requests - ThreadPoolExecutor handles concurrency
        logger.debug(f"  Fetching PDP for: {product_data.get('name', 'Unknown')}")
        
        html = self.client.fetch_pdp_page(slug)
        if not html:
            logger.warning(f"  Failed to fetch PDP for {slug}")
            return product_data
        
        pdp_data = self.client.extract_pdp_data(html)
        if not pdp_data:
            logger.warning(f"  Failed to extract PDP data for {slug}")
            return product_data
        
        logger.debug(f"  PDP enrichment successful for {slug}")
        
        # Store full PDP response
        product_data['pdp_data'] = pdp_data
        
        # Extract ASIN (more reliable from PDP than from slug)
        # If PDP has ASIN, use it (more reliable)
        # If not, keep the ASIN from slug (if it exists)
        pdp_asin = pdp_data.get('asin')
        if pdp_asin:
            product_data['asin'] = pdp_asin
        
        # Always extract Whole Foods ID if available (for products without ASINs)
        wf_id = pdp_data.get('id')
        if wf_id:
            product_data['wf_id'] = str(wf_id)
            # If no ASIN, use Whole Foods ID as identifier
            if not product_data.get('asin'):
                logger.debug(f"  No ASIN for {slug}, using Whole Foods ID: {wf_id}")
        elif not product_data.get('asin'):
            logger.warning(f"  No ASIN or ID found in PDP for {slug}")
        
        # Extract internal ID
        if pdp_data.get('id'):
            product_data['wf_id'] = pdp_data['id']
        
        # Extract brand (object with name, slug)
        brand_data = pdp_data.get('brand', {})
        if isinstance(brand_data, dict) and brand_data.get('name'):
            product_data['brand'] = brand_data['name']
        
        # Extract categories (REQUIRED for category mapping)
        categories = pdp_data.get('categories', {})
        if categories:
            product_data['categories'] = categories
            # Extract category hierarchy for mapping
            category_path = []
            current = categories
            while current:
                if current.get('name'):
                    category_path.append({
                        'name': current.get('name'),
                        'slug': current.get('slug')
                    })
                current = current.get('childCategory')
            product_data['category_hierarchy'] = category_path
        
        # Extract images (multiple sizes)
        images = pdp_data.get('images', [])
        if images:
            image_urls = []
            for img in images[:10]:
                # Prefer 2x image, fall back to regular
                img_url = img.get('image2x') or img.get('image') or img.get('thumbnail')
                if img_url and img_url not in image_urls:
                    image_urls.append(img_url)
            if image_urls:
                product_data['image_urls'] = image_urls
        
        # Extract serving/size info (REQUIRED for size fields)
        serving_info = pdp_data.get('servingInfo', {})
        if serving_info:
            product_data['serving_info'] = serving_info
            # Extract total size
            total_size = serving_info.get('totalSize')
            total_size_uom = serving_info.get('totalSizeUom')
            if total_size:
                product_data['size'] = str(total_size)
            if total_size_uom:
                product_data['size_uom'] = total_size_uom
        
        # Extract ingredients (REQUIRED)
        ingredients = pdp_data.get('ingredients', [])
        if ingredients:
            product_data['ingredients'] = ingredients
        
        # Extract nutrition facts (REQUIRED)
        nutrition = pdp_data.get('nutritionElements', [])
        if nutrition:
            product_data['nutrition_facts'] = nutrition
        
        # Extract diet tags
        diets = pdp_data.get('diets', [])
        if diets:
            product_data['diets'] = [d.get('name') for d in diets if d.get('name')]
        
        # Extract certifications
        certifications = pdp_data.get('certifications', [])
        if certifications:
            product_data['certifications'] = [c.get('name') for c in certifications if c.get('name')]
        
        # Extract availability
        if pdp_data.get('isAvailable') is not None:
            product_data['is_available'] = pdp_data['isAvailable']
        
        # Extract alcohol flag
        if pdp_data.get('isAlcoholic') is not None:
            product_data['is_alcoholic'] = pdp_data['isAlcoholic']
        
        return product_data
    
    def extract_product_data(self, product_data: Dict[str, Any], category_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Extract normalized product data for storage.
        
        Args:
            product_data: Raw product dict from HTML/PDP extraction
            category_name: Category name for mapping
            
        Returns:
            Normalized product dictionary for source_products
        """
        try:
            # Accept either ASIN or Whole Foods ID as external_id
            asin = product_data.get('asin', '')
            wf_id = product_data.get('wf_id', '')
            external_id = asin or wf_id
            
            if not external_id:
                # No identifier at all - skip
                return None
            
            # Skip if already processed
            if external_id in self.discovered_product_ids:
                return None
            
            name = product_data.get('name', '').strip()
            if not name:
                return None
            
            # Get UPC from cache (only for ASINs - products with wf_id have no UPC)
            barcode = None
            if asin:
                barcode = self.asin_to_upc_cache.get(asin)
            
            # Extract images
            image_urls = product_data.get('image_urls', [])
            if not image_urls and product_data.get('image_url'):
                image_urls = [product_data['image_url']]
            image_urls = image_urls[:10]  # Limit to 10
            
            # Extract brand (default to "Whole Foods" for 365 brand or unknown)
            brand = product_data.get('brand', '')
            if not brand or brand == '365':
                brand = '365 by Whole Foods Market'
            
            # Build product page URL (use slug if available, otherwise construct from external_id)
            slug = product_data.get('slug', '')
            if slug:
                product_page_url = f"https://www.wholefoodsmarket.com/product/{slug}"
            else:
                product_page_url = f"https://www.wholefoodsmarket.com/product/{external_id}"
            
            # Parse size from name (e.g., "Product Name, 12 OZ")
            size = None
            size_uom = None
            size_match = re.search(r',?\s*(\d+(?:\.\d+)?)\s*(oz|lb|fl oz|ct|count|pack|ea|g|kg|ml|l|gal|qt|pt)\b', name, re.IGNORECASE)
            if size_match:
                size = size_match.group(1)
                size_uom = size_match.group(2).upper()
            
            # Extract description
            description = product_data.get('description', '')
            if not description:
                # Use 'about' field if available
                about = product_data.get('pdp_data', {}).get('about', [])
                if about:
                    description = ' '.join(about)
            
            # Build metadata
            metadata = {
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'scraper_version': '1.0'
            }
            
            # Include identifier in metadata
            if asin:
                metadata['asin'] = asin
            if wf_id:
                metadata['wf_id'] = wf_id
            
            # Include PDP data if available
            pdp_data = product_data.get('pdp_data')
            if pdp_data:
                metadata['pdp_data'] = pdp_data
            
            # Include ingredients and nutrition
            if product_data.get('ingredients'):
                metadata['ingredients'] = product_data['ingredients']
            if product_data.get('nutrition_facts'):
                metadata['nutrition_facts'] = product_data['nutrition_facts']
            if product_data.get('snap_eligible'):
                metadata['snap_eligible'] = product_data['snap_eligible']
            
            # Determine pricing - use regular_price from store-specific data
            regular_price = product_data.get('regular_price')
            sale_price = product_data.get('sale_price')
            
            # Determine if item is on sale
            is_on_sale = sale_price is not None and sale_price != regular_price
            
            # Use effective price (sale price if on sale, regular otherwise)
            effective_price = sale_price if is_on_sale else regular_price
            
            return {
                # Core identifiers
                'product_id': external_id,  # Use ASIN or wf_id
                'external_id': external_id,  # Use ASIN or wf_id
                'name': name,
                'barcode': barcode,
                'upc': barcode,
                'brand': brand,
                
                # Pricing (from store-specific data)
                'cost_price': effective_price,
                'regular_price': regular_price,
                'sale_price': sale_price,
                'is_on_sale': is_on_sale,
                'sale_start_date': product_data.get('sale_start_date'),
                'sale_end_date': product_data.get('sale_end_date'),
                'price_per_unit': product_data.get('price_per_unit'),
                'price_per_unit_uom': product_data.get('price_per_unit_uom'),
                
                # Size
                'size': size,
                'size_uom': size_uom,
                
                # Images
                'image_url': image_urls[0] if image_urls else '',
                'image_urls': image_urls,
                
                # Category
                'category_name': category_name or '',
                
                # Description
                'description': description,
                
                # URLs
                'product_page_url': product_page_url,
                
                # Store info
                'store_id': product_data.get('store_id'),
                'is_local': product_data.get('is_local', False),
                
                # Metadata
                'metadata': metadata,
                
                # Raw data
                'raw_data': product_data,
            }
            
        except Exception as e:
            logger.error(f"Error extracting product data: {e}", exc_info=True)
            return None
    
    def _generate_handle(self, name: str) -> str:
        """
        Generate handle from product name.
        
        Args:
            name: Product name
            
        Returns:
            URL-friendly handle (lowercase, hyphens for spaces/special chars)
        """
        if not name:
            return ""
        
        handle = name.lower()
        handle = re.sub(r'[^a-z0-9]+', '-', handle)
        handle = re.sub(r'-+', '-', handle).strip('-')
        
        return handle
    
    def store_product_in_supabase(self, product: Dict[str, Any]) -> bool:
        """
        Store product in Supabase database.
        
        Args:
            product: Normalized product dictionary
            
        Returns:
            True if successful, False otherwise
        """
        if self.dry_run:
            logger.info(f"  [DRY-RUN] Would store product: {product.get('name', 'Unknown')} (ASIN: {product.get('product_id', 'N/A')})")
            self.discovered_product_ids.add(product.get('product_id', ''))
            return True
        
        if not self.supabase_client:
            logger.warning("Supabase client not available - skipping product storage")
            return False
        
        try:
            from uuid import uuid4
            
            store_product_id = product.get('product_id') or product.get('external_id')
            barcode = product.get('barcode') or product.get('upc')
            
            # Find existing product by barcode OR external_id (ASIN)
            product_uuid = None
            
            # First try by barcode
            if barcode and len(barcode) >= 6:
                existing_result = self.supabase_client.table('source_products').select('id, name, category_id').eq('barcode', barcode).limit(1).execute()
                if existing_result.data:
                    product_uuid = existing_result.data[0]['id']
            
            # If not found, try by external_id (ASIN)
            if not product_uuid and store_product_id:
                existing_result = self.supabase_client.table('source_products').select('id, name, category_id').eq('external_id', store_product_id).limit(1).execute()
                if existing_result.data:
                    product_uuid = existing_result.data[0]['id']
            
            # Normalize category (use 'whole_foods' as retailer key)
            category_name = product.get('category_name', '')
            goods_category_slug = self.normalize_category(category_name, category_name)
            
            # Get category IDs from Supabase using new slug-based lookup
            category_id = None
            subcategory_id = None
            
            if goods_category_slug and goods_category_slug != 'uncategorized':
                from scrapers.category_lookup import resolve_category_ids_from_slug
                category_id, subcategory_id = resolve_category_ids_from_slug(self.supabase_client, goods_category_slug)
                if category_id:
                    logger.debug(f"Resolved category slug '{goods_category_slug}' -> category_id={category_id}, subcategory_id={subcategory_id}")
                else:
                    logger.debug(f"Could not resolve category slug '{goods_category_slug}' for category_name '{category_name}'")
            
            if product_uuid:
                # Update existing product
                product_update = {
                    'name': product['name'],
                    'image_url': product.get('image_url', ''),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                # Core fields
                if product.get('brand'):
                    product_update['brand'] = product['brand']
                if barcode:
                    product_update['barcode'] = barcode
                if product.get('size'):
                    product_update['size'] = product['size']
                if product.get('size_uom'):
                    product_update['size_uom'] = product['size_uom']
                
                # Generate handle
                if product.get('name'):
                    product_update['handle'] = self._generate_handle(product['name'])
                
                # Category fields
                if category_id:
                    product_update['category_id'] = category_id
                if subcategory_id:
                    product_update['subcategory_id'] = subcategory_id
                
                # PDP enrichment fields
                if product.get('external_id'):
                    product_update['external_id'] = product['external_id']
                if product.get('description'):
                    product_update['description'] = product['description']
                if product.get('product_page_url'):
                    product_update['product_page_url'] = product['product_page_url']
                if product.get('metadata'):
                    product_update['metadata'] = product['metadata']
                if product.get('raw_data'):
                    product_update['raw_data'] = product['raw_data']
                
                self.supabase_client.table('source_products').update(product_update).eq('id', product_uuid).execute()
                logger.debug(f"Updated product {product['name']} (ID: {product_uuid})")
            else:
                # Create new product
                product_data = {
                    'id': str(uuid4()),
                    'name': product['name'],
                    'image_url': product.get('image_url', ''),
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                # Core fields
                if product.get('brand'):
                    product_data['brand'] = product['brand']
                if barcode:
                    product_data['barcode'] = barcode
                if product.get('size'):
                    product_data['size'] = product['size']
                if product.get('size_uom'):
                    product_data['size_uom'] = product['size_uom']
                
                # Generate handle
                if product.get('name'):
                    product_data['handle'] = self._generate_handle(product['name'])
                
                # Category fields
                if category_id:
                    product_data['category_id'] = category_id
                if subcategory_id:
                    product_data['subcategory_id'] = subcategory_id
                
                # PDP enrichment fields
                if product.get('external_id'):
                    product_data['external_id'] = product['external_id']
                if product.get('description'):
                    product_data['description'] = product['description']
                if product.get('product_page_url'):
                    product_data['product_page_url'] = product['product_page_url']
                if product.get('metadata'):
                    product_data['metadata'] = product['metadata']
                if product.get('raw_data'):
                    product_data['raw_data'] = product['raw_data']
                
                result = self.supabase_client.table('source_products').insert(product_data).execute()
                if result.data:
                    product_uuid = product_data['id']
                    logger.debug(f"Created product {product['name']} (ID: {product_uuid})")
            
            if product_uuid:
                # Get stock_location_id and retailer_location_id
                stock_location_id = self._get_stock_location_id(self.retailer_name)
                retailer_location_id = str(product.get('store_id') or self.client.store_id or self.store_id)
                
                # Upsert retailer mapping to goods_retailer_mapping
                mapping_record = {
                    'product_id': product_uuid,
                    'store_name': self.retailer_name,
                    'store_item_id': store_product_id,
                    'store_item_name': product['name'],
                    'store_image_url': product.get('image_url', ''),
                    'stock_location_id': stock_location_id,
                    'retailer_location_id': retailer_location_id,
                    'is_active': True,
                    'last_seen_at': datetime.now(timezone.utc).isoformat(),
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                }
                
                # Upsert with new unique constraint
                self.supabase_client.table('goods_retailer_mapping').upsert(
                    mapping_record,
                    on_conflict='product_id,stock_location_id,retailer_location_id,store_item_id'
                ).execute()
                
                # Insert pricing record with store-specific data to goods_retailer_pricing
                regular_price = product.get('regular_price')
                sale_price = product.get('sale_price')
                
                if regular_price or sale_price:
                    # Use effective price (sale if on sale, regular otherwise)
                    is_on_sale = product.get('is_on_sale', False)
                    effective_price = sale_price if is_on_sale and sale_price else regular_price
                    
                    pricing_record = {
                        'product_id': product_uuid,
                        'store_name': self.retailer_name,
                        'location_id': retailer_location_id,  # Keep for backward compatibility
                        'retailer_location_id': retailer_location_id,
                        'list_price': float(regular_price) if regular_price else None,
                        'sale_price': float(sale_price) if sale_price else None,
                        'is_on_sale': is_on_sale,
                        'is_price_cut': product.get('is_price_cut', False),
                        'price_type': product.get('price_type'),
                        'effective_from': datetime.now(timezone.utc).isoformat(),
                        'effective_to': None,  # Current price
                        'pricing_context': product.get('pricing_context'),
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                    }
                    
                    # Insert pricing record (pricing has history, so we insert new records)
                    try:
                        self.supabase_client.table('goods_retailer_pricing').insert(pricing_record).execute()
                        logger.debug(f"  Stored pricing: ${effective_price:.2f} (regular: ${regular_price}, sale: {sale_price}, on_sale: {is_on_sale})")
                    except Exception as e:
                        # If duplicate key error, that's okay - price already recorded for this effective_from
                        if 'duplicate key' not in str(e).lower() and 'unique constraint' not in str(e).lower():
                            raise  # Re-raise if it's a different error
                        logger.debug(f"Price record already exists for product {product_uuid} at {retailer_location_id} on {pricing_record['effective_from']}")
                
                # Store images
                self._store_product_images(product, product_uuid)
            
            self.discovered_product_ids.add(store_product_id)
            return True
            
        except Exception as e:
            logger.error(f"Error storing product {product.get('product_id', 'unknown')}: {e}", exc_info=True)
            return False
    
    def _store_product_images(self, product: Dict[str, Any], product_uuid: str) -> None:
        """
        Store product images in Medusa's image table.
        
        Args:
            product: Normalized product dictionary
            product_uuid: Product UUID in database
        """
        try:
            image_urls = product.get('image_urls', [])
            if not image_urls:
                return
            
            # Check existing images
            existing_result = self.supabase_client.table('image').select('url').eq('product_id', product_uuid).execute()
            existing_urls = {img['url'] for img in (existing_result.data or [])}
            
            # Prepare new images
            new_images = []
            for rank, url in enumerate(image_urls[:10]):
                if url and url not in existing_urls:
                    new_images.append({
                        'id': f'img_{uuid.uuid4().hex[:24]}',
                        'url': url,
                        'rank': rank,
                        'product_id': product_uuid,
                        'metadata': {
                            'source': self.retailer_name,
                            'scraped_at': datetime.now(timezone.utc).isoformat()
                        },
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })
            
            if new_images:
                try:
                    self.supabase_client.table('image').insert(new_images).execute()
                    logger.debug(f"Stored {len(new_images)} images for product {product.get('external_id')}")
                except Exception as e:
                    # Try one at a time on failure
                    stored = 0
                    for img in new_images:
                        try:
                            self.supabase_client.table('image').insert(img).execute()
                            stored += 1
                        except:
                            pass
                    if stored > 0:
                        logger.debug(f"Stored {stored} images for product {product.get('external_id')}")
                    
        except Exception as e:
            logger.error(f"Error storing product images: {e}")
    
    def run(self, strategy: str = 'categories', start_from_category: int = 0) -> Dict[str, Any]:
        """
        Run the scraper.
        
        Args:
            strategy: Scraping strategy ('categories' only for now)
            start_from_category: Category index to start from (0-based)
            
        Returns:
            Dict with scraping statistics
        """
        start_time = time.time()
        
        logger.info("=" * 60)
        logger.info("WHOLE FOODS SCRAPER STARTING")
        logger.info("=" * 60)
        logger.info(f"Strategy: {strategy}")
        logger.info(f"Dry Run: {self.dry_run}")
        logger.info(f"Max Items: {self.max_items or 'Unlimited'}")
        logger.info(f"UPC Conversion: {'Enabled' if self.rocketsource else 'Disabled'}")
        logger.info("=" * 60)
        
        # Discover categories
        categories = self.discover_categories()
        categories = self.filter_grocery_categories(categories)
        
        if not categories:
            logger.error("No categories found!")
            return {'scraped': 0, 'failed': 0, 'elapsed_seconds': 0}
        
        logger.info(f"Found {len(categories)} grocery categories to scrape")
        
        # Start from specified category
        if start_from_category > 0:
            logger.info(f"Starting from category index {start_from_category}")
            categories = categories[start_from_category:]
        
        # Scrape each category
        for idx, category in enumerate(categories):
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"Reached max items limit ({self.max_items}) - stopping")
                break
            
            actual_idx = idx + start_from_category
            logger.info(f"\n[{actual_idx + 1}/{len(categories) + start_from_category}] Processing: {category['name']}")
            
            try:
                self.scrape_category(category)
            except Exception as e:
                logger.error(f"Error scraping category {category['name']}: {e}", exc_info=True)
            
            # Progress update
            logger.info(f"Progress: {self.scraped_count} scraped, {self.failed_count} failed")
        
        # Convert ASINs to UPCs for products missing barcodes (single efficient batch)
        self._convert_missing_barcodes()
        
        elapsed = time.time() - start_time
        
        logger.info("\n" + "=" * 60)
        logger.info("SCRAPING COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Total scraped: {self.scraped_count}")
        logger.info(f"Total failed: {self.failed_count}")
        logger.info(f"Elapsed time: {elapsed:.2f} seconds ({elapsed/60:.1f} minutes)")
        if self.scraped_count > 0:
            logger.info(f"Average: {elapsed/self.scraped_count:.2f} seconds per product")
        logger.info("=" * 60)
        
        return {
            'scraped': self.scraped_count,
            'failed': self.failed_count,
            'elapsed_seconds': elapsed
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Scrape Whole Foods products from HTML pages',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scrapers/whole_foods_scraper.py --no-dry-run
  python3 scrapers/whole_foods_scraper.py --max-items 100
  python3 scrapers/whole_foods_scraper.py --skip-upc-conversion
        """
    )
    
    parser.add_argument(
        '--store-id',
        default=os.getenv('WHOLE_FOODS_STORE_ID'),
        help='Whole Foods store ID (optional)'
    )
    
    parser.add_argument(
        '--cookies',
        default=os.getenv('WHOLE_FOODS_COOKIES'),
        help='Cookie string from browser (or set WHOLE_FOODS_COOKIES env var)'
    )
    
    parser.add_argument(
        '--cookies-file',
        type=str,
        help='Path to file containing cookies (alternative to --cookies)'
    )
    
    parser.add_argument(
        '--rocketsource-token',
        default=os.getenv('ROCKETSOURCE_API_TOKEN'),
        help='RocketSource API token for ASIN-to-UPC conversion'
    )
    
    parser.add_argument(
        '--skip-upc-conversion',
        action='store_true',
        help='Skip ASIN-to-UPC conversion via RocketSource API'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=WholeFoodsScraper.DEFAULT_DELAY,
        help=f'Base delay between requests in seconds (default: {WholeFoodsScraper.DEFAULT_DELAY})'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=WholeFoodsScraper.DEFAULT_DELAY_VARIANCE,
        help=f'Random variance in delay in seconds (default: {WholeFoodsScraper.DEFAULT_DELAY_VARIANCE})'
    )
    
    parser.add_argument(
        '--max-workers',
        type=int,
        default=WholeFoodsScraper.DEFAULT_MAX_WORKERS,
        help=f'Number of parallel workers for PDP requests (default: {WholeFoodsScraper.DEFAULT_MAX_WORKERS})'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable debug logging'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        default=True,
        help='Run without saving to database (default: True for safety)'
    )
    
    parser.add_argument(
        '--no-dry-run',
        action='store_true',
        help='Disable dry-run mode (will save to Supabase). Overrides --dry-run.'
    )
    
    parser.add_argument(
        '--max-items',
        type=int,
        help='Maximum number of items to scrape (useful for testing)'
    )
    
    parser.add_argument(
        '--start-from-category',
        type=int,
        default=0,
        help='Category index to start from (0-based, for resuming). Default: 0'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Handle dry-run flag
    dry_run = not args.no_dry_run
    
    # Load cookies from file if provided
    cookies = args.cookies
    if args.cookies_file:
        try:
            try:
                import json
                with open(args.cookies_file, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        cookies = data.get('cookies') or data.get('cookie') or data.get('cookie_string')
                    else:
                        cookies = data
            except (json.JSONDecodeError, ValueError):
                with open(args.cookies_file, 'r') as f:
                    cookies = f.read().strip()
            
            if not cookies:
                logger.error(f"No cookies found in file {args.cookies_file}")
                sys.exit(1)
            
            logger.info(f"Loaded cookies from {args.cookies_file}")
        except Exception as e:
            logger.error(f"Failed to load cookies from file: {e}")
            sys.exit(1)
    
    logger.info("=" * 60)
    logger.info("WHOLE FOODS SCRAPER CONFIGURATION")
    logger.info("=" * 60)
    logger.info(f"Store ID: {args.store_id or 'Not specified'}")
    logger.info(f"Dry Run: {dry_run}")
    logger.info(f"Max Items: {args.max_items or 'Unlimited'}")
    logger.info(f"Cookies: {'Provided' if cookies else 'Will establish session'}")
    logger.info(f"RocketSource: {'Token provided' if args.rocketsource_token else 'No token (UPC conversion disabled)'}")
    logger.info(f"Skip UPC Conversion: {args.skip_upc_conversion}")
    logger.info(f"Log File: {log_file}")
    logger.info("=" * 60)
    
    # Verify Supabase configuration if not in dry-run mode
    if not dry_run:
        from app.supabase_config import get_config
        config = get_config()
        if not config.is_configured():
            logger.error("=" * 60)
            logger.error("SUPABASE CONFIGURATION ERROR")
            logger.error("=" * 60)
            logger.error("Supabase is not configured. Please set:")
            logger.error("  - SUPABASE_URL")
            logger.error("  - SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY")
            logger.error("")
            logger.error("See docs/technical/environment-variables.md for setup instructions.")
            logger.error("=" * 60)
            sys.exit(1)
        
        if config.service_role_key:
            logger.info("✓ Supabase service role key configured")
        else:
            logger.warning("⚠ Using Supabase anon key (service role key recommended for scrapers)")
        logger.info(f"✓ Supabase URL: {config.url}")
    
    # Initialize scraper
    scraper = WholeFoodsScraper(
        store_id=args.store_id,
        cookies=cookies,
        rocketsource_token=args.rocketsource_token,
        dry_run=dry_run,
        rate_limit_delay=args.delay,
        rate_limit_variance=args.delay_variance,
        max_items=args.max_items,
        skip_upc_conversion=args.skip_upc_conversion,
        max_workers=args.max_workers
    )
    
    # Run scraper
    try:
        stats = scraper.run(strategy='categories', start_from_category=args.start_from_category)
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Scraping interrupted by user")
        stats = {
            'scraped': scraper.scraped_count,
            'failed': scraper.failed_count,
            'elapsed_seconds': 0
        }
        sys.exit(130)
    except Exception as e:
        logger.error(f"\n❌ Fatal error during scraping: {e}", exc_info=True)
        stats = {
            'scraped': scraper.scraped_count,
            'failed': scraper.failed_count,
            'elapsed_seconds': 0
        }
        sys.exit(1)
    
    # Print summary
    print("\n" + "=" * 60)
    print("SCRAPE SUMMARY")
    print("=" * 60)
    print(f"Store ID: {args.store_id or 'Not specified'}")
    print(f"Dry Run: {dry_run}")
    print(f"Items scraped: {stats.get('scraped', 0):,}")
    print(f"Items failed: {stats.get('failed', 0):,}")
    elapsed = stats.get('elapsed_seconds', 0)
    print(f"Elapsed time: {elapsed:.2f} seconds ({elapsed/60:.1f} minutes)")
    if stats.get('scraped', 0) > 0:
        print(f"Average: {elapsed/stats.get('scraped', 1):.2f} seconds per product")
    print(f"Log file: {log_file}")
    print("=" * 60)
    
    if stats.get('scraped', 0) == 0 and stats.get('failed', 0) > 0:
        logger.error("No products scraped successfully - check logs for errors")
        sys.exit(1)


if __name__ == '__main__':
    main()

