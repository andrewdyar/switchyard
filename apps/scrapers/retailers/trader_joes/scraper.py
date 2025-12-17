#!/usr/bin/env python3
"""
Trader Joe's product scraper with PDP enrichment.

This scraper:
- Uses Trader Joe's GraphQL API to discover and scrape products
- Converts 6-digit SKUs to EAN-8 barcodes
- Two-phase approach: discovery (GetAllProducts) + enrichment (SearchProduct/PDP)
- Extracts category hierarchy, descriptions, country of origin, and metadata
- Stores products in Supabase database with full PDP data

Usage:
    python3 scrapers/trader_joes_scraper.py --no-dry-run
    python3 scrapers/trader_joes_scraper.py --max-items 100
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
import requests
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.base_scraper import BaseScraper
from core.category_mapping import TRADERJOES_CATEGORY_MAP, normalize_category, should_include_category

# Configure logging with file handler for remote execution
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, f'trader_joes_scrape_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

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


def calculate_ean8_check_digit(digits_7: str) -> str:
    """
    Calculate EAN-8 check digit using weights [3,1,3,1,3,1,3].
    
    Args:
        digits_7: 7-digit string (prefix "0" + 6-digit SKU)
        
    Returns:
        Check digit as string
    """
    weights = [3, 1, 3, 1, 3, 1, 3]
    total = sum(int(d) * w for d, w in zip(digits_7, weights))
    check = (10 - (total % 10)) % 10
    return str(check)


def sku_to_ean8(sku: str) -> str:
    """
    Convert 6-digit Trader Joe's SKU to EAN-8 barcode.
    
    Args:
        sku: 6-digit SKU string
        
    Returns:
        EAN-8 barcode string (8 digits)
        
    Example:
        SKU "086453" → EAN-8 "00864534"
    """
    if not sku:
        return None
    
    # Ensure SKU is 6 digits (pad with zeros if needed)
    sku_padded = sku.zfill(6)
    
    # EAN-8 = "0" + SKU (6 digits) + check digit
    ean7 = "0" + sku_padded  # e.g., "0086453"
    check = calculate_ean8_check_digit(ean7)
    return ean7 + check  # e.g., "00864534"


class TraderJoesGraphQLClient:
    """GraphQL client for Trader Joe's API."""
    
    BASE_URL = "https://www.traderjoes.com/api/graphql"
    HOMEPAGE_URL = "https://www.traderjoes.com/home"
    
    def __init__(self, cookies: Optional[str] = None):
        """
        Initialize the GraphQL client.
        
        Args:
            cookies: Optional cookie string from browser (if None, will establish session)
        """
        self.session = requests.Session()
        
        # Setup retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set headers to match actual browser request (from products-2 page)
        self.session.headers.update({
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'dnt': '1',
            'origin': 'https://www.traderjoes.com',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'referer': 'https://www.traderjoes.com/home/products/category/products-2',
            'sec-ch-ua': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'sec-gpc': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        })
        
        # Set cookies if provided
        if cookies:
            self._set_cookies_from_string(cookies)
        else:
            # Establish session by visiting homepage
            self._establish_session()
    
    def _set_cookies_from_string(self, cookie_string: str):
        """Parse and set cookies from a cookie string."""
        from http.cookies import SimpleCookie
        
        cookie_jar = requests.cookies.RequestsCookieJar()
        
        # Parse the cookie string
        for cookie in cookie_string.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                cookie_jar.set(key.strip(), value.strip(), domain='.traderjoes.com', path='/')
        
        self.session.cookies.update(cookie_jar)
        logger.debug(f"Set {len(cookie_jar)} cookies from provided string")
    
    def _establish_session(self):
        """Establish a session by visiting the homepage to get cookies."""
        try:
            logger.debug("Establishing session with Trader Joe's...")
            
            # Visit homepage to get initial cookies
            response = self.session.get(self.HOMEPAGE_URL, timeout=15, allow_redirects=True)
            response.raise_for_status()
            
            logger.debug(f"Session established - got {len(self.session.cookies)} cookies")
            
        except Exception as e:
            logger.warning(f"Session establishment failed (continuing anyway): {e}")
    
    def query(self, operation: str, variables: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """
        Execute a GraphQL query.
        
        Args:
            operation: GraphQL operation name (e.g., 'SearchProducts', 'GetProductBySku', 'SearchProduct')
            variables: GraphQL variables dictionary
            
        Returns:
            Response data dict or None on error
        """
        payload = {
            'operationName': operation,
            'variables': variables or {},
        }
        
        # Add query based on operation
        if operation == 'SearchProducts':
            payload['query'] = """
                query SearchProducts($filter: ProductAttributeFilterInput, $currentPage: Int, $pageSize: Int) {
                    products(filter: $filter, currentPage: $currentPage, pageSize: $pageSize) {
                        items {
                            sku
                            item_title
                            retail_price
                            sales_size
                            sales_uom_description
                            primary_image
                            other_images
                            fun_tags
                        }
                        total_count
                    }
                }
            """
        elif operation == 'GetAllProducts':
            # Query for all products with published=1 filter (active products only)
            # Also filters out products with price = 0
            payload['query'] = """
                query GetAllProducts($currentPage: Int, $pageSize: Int) {
                    products(
                        filter: {
                            availability: {match: "1"},
                            published: {eq: "1"}
                        }, 
                        currentPage: $currentPage, 
                        pageSize: $pageSize
                    ) {
                        items {
                            sku
                            item_title
                            retail_price
                            sales_size
                            sales_uom_description
                            primary_image
                            other_images
                            fun_tags
                        }
                        total_count
                    }
                }
            """
        elif operation == 'SearchProduct':
            # PDP query - full product details for enrichment
            payload['query'] = """
                query SearchProduct($sku: String, $published: String = "1") {
                    products(
                        filter: {sku: {eq: $sku}, published: {eq: $published}}
                    ) {
                        items {
                            sku
                            item_title
                            retail_price
                            sales_size
                            sales_uom_description
                            primary_image
                            other_images
                            fun_tags
                            category_hierarchy {
                                id
                                name
                                url_key
                                level
                            }
                            item_story_marketing
                            country_of_origin
                        }
                    }
                }
            """
        elif operation == 'GetProductBySku':
            payload['query'] = """
                query GetProductBySku($sku: String!) {
                    products(filter: {sku: {eq: $sku}}) {
                        items {
                            sku
                            item_title
                            retail_price
                            sales_size
                            sales_uom_description
                            primary_image
                            other_images
                            fun_tags
                        }
                    }
                }
            """
        else:
            logger.error(f"Unknown operation: {operation}")
            return None
        
        try:
            response = self.session.post(self.BASE_URL, json=payload, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Check for GraphQL errors
            if 'errors' in data:
                error_messages = [e.get('message', 'Unknown error') for e in data['errors']]
                logger.warning(f"GraphQL errors: {error_messages}")
                return None
            
            return data.get('data')
            
        except requests.exceptions.Timeout:
            logger.error(f"GraphQL request timed out for operation {operation}")
            return None
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                logger.warning(f"Rate limited on GraphQL request, waiting longer...")
                time.sleep(10)
            logger.error(f"GraphQL request failed (HTTP {e.response.status_code}): {e}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"GraphQL request failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in GraphQL request: {e}")
            return None


class TraderJoesScraper(BaseScraper):
    """Scraper for Trader Joe's products using GraphQL API."""
    
    DEFAULT_DELAY = 1.0
    DEFAULT_DELAY_VARIANCE = 0.3
    DEFAULT_PAGE_SIZE = 24
    
    def __init__(
        self,
        store_code: Optional[str] = None,
        cookies: Optional[str] = None,
        dry_run: bool = True,  # Default to dry-run for safety
        rate_limit_delay: float = DEFAULT_DELAY,
        rate_limit_variance: float = DEFAULT_DELAY_VARIANCE,
        max_items: Optional[int] = None
    ):
        """
        Initialize the Trader Joe's scraper.
        
        Args:
            store_code: Trader Joe's store code (default: "TJ")
            cookies: Optional cookie string from browser (for authentication)
            dry_run: If True, skip Supabase storage and only log products (default: True)
            rate_limit_delay: Base delay between requests (seconds)
            rate_limit_variance: Random variance in delay (seconds)
            max_items: Maximum items to scrape (None = no limit)
        """
        self.store_code = store_code or "TJ"
        
        # Initialize base scraper
        # Note: retailer_name='trader_joes' for store_name in product_store_mappings
        # but category mapping uses 'traderjoes' (no underscore)
        super().__init__(
            retailer_name='trader_joes',  # For Supabase store_name
            store_id=self.store_code,
            dry_run=dry_run,
            rate_limit_delay=rate_limit_delay,
            rate_limit_variance=rate_limit_variance,
            max_items=max_items
        )
        
        # Store the category mapping key separately
        self.category_retailer_key = 'traderjoes'  # For category mapping (no underscore)
        
        self.page_size = self.DEFAULT_PAGE_SIZE
        
        # Initialize GraphQL client with cookies
        self.client = TraderJoesGraphQLClient(cookies=cookies)
        
        logger.info(f"Initialized Trader Joe's scraper (store_code: {self.store_code}, dry_run: {self.dry_run})")
    
    BASE_IMAGE_URL = "https://www.traderjoes.com"
    BASE_PDP_URL = "https://www.traderjoes.com/home/products/pdp"
    
    def _normalize_image_url(self, url: Optional[str]) -> Optional[str]:
        """Ensure image URL is absolute."""
        if not url:
            return None
        if url.startswith('/'):
            return f"{self.BASE_IMAGE_URL}{url}"
        return url
    
    def _extract_image_url(self, img: Any) -> Optional[str]:
        """Extract URL from various image formats."""
        if isinstance(img, str):
            return self._normalize_image_url(img)
        elif isinstance(img, dict):
            return self._normalize_image_url(
                img.get('url') or img.get('path') or img.get('src')
            )
        return None
    
    def _generate_product_slug(self, item_title: str, sku: str) -> str:
        """
        Generate product URL slug from item title and SKU.
        
        Args:
            item_title: Product title (e.g., "Cold Brew Coffee Black")
            sku: Product SKU (e.g., "080794")
            
        Returns:
            URL slug (e.g., "cold-brew-coffee-black-080794")
        """
        if not item_title or not sku:
            return ""
        
        # Convert to lowercase
        slug = item_title.lower()
        
        # Replace special characters with spaces, then spaces with hyphens
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)  # Remove special chars except spaces and hyphens
        slug = re.sub(r'\s+', '-', slug.strip())  # Replace spaces with hyphens
        slug = re.sub(r'-+', '-', slug)  # Remove duplicate hyphens
        
        # Append SKU
        return f"{slug}-{sku}"
    
    def _build_product_page_url(self, item_title: str, sku: str) -> str:
        """
        Build product page URL from item title and SKU.
        
        Args:
            item_title: Product title
            sku: Product SKU
            
        Returns:
            Full product page URL
        """
        slug = self._generate_product_slug(item_title, sku)
        if not slug:
            return ""
        return f"{self.BASE_PDP_URL}/{slug}"
    
    def _clean_html(self, html_text: Optional[str]) -> Optional[str]:
        """
        Remove HTML tags from text.
        
        Args:
            html_text: Text with HTML tags (e.g., "<p>Description</p>")
            
        Returns:
            Clean text without HTML tags
        """
        if not html_text:
            return None
        
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', html_text)
        
        # Decode common HTML entities
        clean = clean.replace('&amp;', '&')
        clean = clean.replace('&lt;', '<')
        clean = clean.replace('&gt;', '>')
        clean = clean.replace('&quot;', '"')
        clean = clean.replace('&#39;', "'")
        clean = clean.replace('&nbsp;', ' ')
        
        # Normalize whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        
        return clean if clean else None
    
    def _parse_country_of_origin(self, origin_text: Optional[str]) -> Optional[str]:
        """
        Parse country name from country_of_origin field.
        
        Args:
            origin_text: Origin text (e.g., "Product of Turkey", "Made in USA")
            
        Returns:
            Country name only (e.g., "Turkey", "USA")
        """
        if not origin_text:
            return None
        
        # Normalize whitespace
        origin_text = origin_text.strip()
        
        # Common patterns to extract country from
        patterns = [
            r'^Product of\s+(.+)$',
            r'^Made in\s+(.+)$',
            r'^Produced in\s+(.+)$',
            r'^From\s+(.+)$',
            r'^Imported from\s+(.+)$',
            r'^Product of the\s+(.+)$',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, origin_text, re.IGNORECASE)
            if match:
                country = match.group(1).strip()
                # Clean up trailing periods or special chars
                country = re.sub(r'[.\s]+$', '', country)
                return country
        
        # If no pattern matches, return the original text (might just be "USA", "Turkey", etc.)
        return origin_text
    
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
        
        # Convert to lowercase
        handle = name.lower()
        
        # Replace non-alphanumeric characters with hyphens
        handle = re.sub(r'[^a-z0-9]+', '-', handle)
        
        # Remove leading/trailing hyphens and collapse multiple hyphens
        handle = re.sub(r'-+', '-', handle).strip('-')
        
        return handle
    
    def normalize_category(self, category_path: str, parent: str = None) -> str:
        """
        Map retailer category to Goods taxonomy slug.
        
        Overrides BaseScraper to use 'traderjoes' (no underscore) for category mapping.
        
        Args:
            category_path: Retailer-specific category/subcategory name
            parent: Parent category name (for nested structures)
            
        Returns:
            Most specific Goods category slug (e.g., 'berries', 'cheese', 'produce')
        """
        # Use 'traderjoes' (no underscore) for category mapping
        return normalize_category(self.category_retailer_key, category_path, parent)
    
    def should_include_category(self, category_path: str, parent: str = None) -> bool:
        """
        Determine if a category should be scraped (grocery only).
        
        Overrides BaseScraper to use 'traderjoes' (no underscore) for category mapping.
        
        Args:
            category_path: Retailer-specific category/subcategory name
            parent: Parent category name (for nested structures)
            
        Returns:
            True if category should be scraped, False otherwise
        """
        # Use 'traderjoes' (no underscore) for category mapping
        return should_include_category(self.category_retailer_key, category_path, parent)
    
    def run(self, strategy: str = 'all', start_from_category: int = 0) -> Dict[str, int]:
        """
        Run the Trader Joe's scraper with two-phase approach:
        Phase 1: Discover all products (GetAllProducts)
        Phase 2: Enrich each product with PDP data (SearchProduct)
        
        Args:
            strategy: Ignored (kept for compatibility, always uses 'all')
            start_from_category: Ignored (kept for compatibility)
            
        Returns:
            Dictionary with scraping statistics
        """
        logger.info("=" * 60)
        logger.info("TRADER JOE'S Product Scraper (Two-Phase PDP Enrichment)")
        logger.info("=" * 60)
        
        start_time = time.time()
        
        # Two-phase scraping: discover + enrich
        self.scrape_all_products_with_enrichment()
        
        elapsed_time = time.time() - start_time
        
        stats = {
            'scraped': self.scraped_count,
            'failed': self.failed_count,
            'elapsed_seconds': elapsed_time
        }
        
        logger.info("=" * 60)
        logger.info("Scraping Complete!")
        logger.info(f"  ✅ Scraped: {self.scraped_count} products")
        logger.info(f"  ❌ Failed: {self.failed_count} products")
        logger.info(f"  ⏱️  Time: {elapsed_time:.2f} seconds")
        logger.info("=" * 60)
        
        return stats
    
    def scrape_all_products_with_enrichment(self) -> None:
        """
        Two-phase scraping:
        Phase 1: Discover all products using GetAllProducts (filter: published=1, price!=0)
        Phase 2: For each product, make a PDP request (SearchProduct) to get full details
        
        This ensures we get complete product data including:
        - Category hierarchy (for mapping to Goods categories)
        - item_story_marketing (for description)
        - country_of_origin (for origin_country)
        - Full metadata
        """
        current_page = 1
        total_count = None
        
        logger.info("=" * 60)
        logger.info("PHASE 1: Discovering all products...")
        logger.info("=" * 60)
        
        while True:
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                break
            
            # Rate limiting
            delay = self._get_random_delay()
            logger.debug(f"Waiting {delay:.2f}s before page {current_page}...")
            time.sleep(delay)
            
            # Make GraphQL request for product list
            logger.info(f"Fetching page {current_page}...")
            
            response = self.client.query(
                operation='GetAllProducts',
                variables={
                    'currentPage': current_page,
                    'pageSize': self.page_size
                }
            )
            
            if not response:
                logger.error(f"Failed to fetch page {current_page}")
                if current_page == 1:
                    logger.error("Failed on first page, aborting")
                break
            
            # Extract products from response
            products_data = response.get('products', {})
            products = products_data.get('items', [])
            page_total_count = products_data.get('total_count', 0)
            
            # Set total count on first page
            if current_page == 1 and page_total_count > 0:
                total_count = page_total_count
                total_pages = (total_count + self.page_size - 1) // self.page_size
                logger.info(f"Found {total_count} total products ({total_pages} pages)")
            
            if not products:
                logger.info(f"No products found at page {current_page}, stopping")
                break
            
            logger.info(f"Found {len(products)} products on page {current_page}")
            
            # PHASE 2: Enrich each product with PDP data
            for product in products:
                if self.max_items and self.scraped_count >= self.max_items:
                    break
                
                sku = product.get('sku')
                price = product.get('retail_price', 0)
                
                # Skip if no SKU or already processed
                if not sku or sku in self.discovered_product_ids:
                    continue
                
                # Skip products with price = 0 (likely discontinued/unavailable)
                if price is None or float(price) == 0:
                    logger.debug(f"Skipping product {sku} with price = 0")
                    continue
                
                # Get enriched PDP data
                pdp_data = self._fetch_pdp_data(sku)
                
                if pdp_data:
                    # Use PDP data (has category_hierarchy, item_story_marketing, etc.)
                    normalized = self.extract_product_data(pdp_data)
                else:
                    # Fallback to basic product data if PDP fails
                    logger.warning(f"PDP fetch failed for SKU {sku}, using basic data")
                    normalized = self.extract_product_data(product)
                
                if normalized:
                    if self.dry_run:
                        logger.info(f"  [DRY-RUN] Would store: {normalized.get('name', 'Unknown')} (SKU: {sku})")
                        self.scraped_count += 1
                    else:
                        if self.store_product_in_supabase(normalized):
                            self.scraped_count += 1
                        else:
                            self.failed_count += 1
                else:
                    self.failed_count += 1
            
            # Check if we should continue pagination
            if len(products) < self.page_size:
                logger.info(f"Reached last page ({total_count} total products)")
                break
            
            if total_count and current_page * self.page_size >= total_count:
                logger.info(f"Reached end of all products ({total_count} total)")
                break
            
            current_page += 1
            
            # Periodic progress report
            if self.scraped_count > 0 and self.scraped_count % 100 == 0:
                logger.info(f"Progress: {self.scraped_count} items scraped so far")
    
    def _fetch_pdp_data(self, sku: str) -> Optional[Dict[str, Any]]:
        """
        Fetch full product data from PDP endpoint.
        
        Args:
            sku: Product SKU
            
        Returns:
            Full product data dict or None on error
        """
        # Rate limiting between PDP requests
        delay = self._get_random_delay() * 0.5  # Slightly shorter delay for PDP requests
        time.sleep(delay)
        
        response = self.client.query(
            operation='SearchProduct',
            variables={
                'sku': sku,
                'published': '1'
            }
        )
        
        if not response:
            return None
        
        products = response.get('products', {}).get('items', [])
        if not products:
            return None
        
        return products[0]
    
    def scrape_all_products(self) -> None:
        """
        Legacy method - redirects to new two-phase scraper.
        """
        self.scrape_all_products_with_enrichment()
    
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover product categories from Trader Joe's API category structure.
        
        Loads categories from the sample JSON file which contains the actual
        category hierarchy with numeric IDs from the Trader Joe's API.
        
        Returns:
            List of category dictionaries with name, parent, id (numeric), and url_key fields.
        """
        logger.info("Discovering categories from Trader Joe's category structure...")
        
        # Load category structure from JSON file
        categories_file = os.path.join(
            os.path.dirname(__file__),
            'trader_joes',
            'samples',
            'tj_categories.json'
        )
        
        if not os.path.exists(categories_file):
            logger.warning(f"Category file not found: {categories_file}, falling back to category mapping")
            return self._discover_categories_from_mapping()
        
        try:
            with open(categories_file, 'r') as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load category file: {e}, falling back to category mapping")
            return self._discover_categories_from_mapping()
        
        categories = []
        category_list = data.get('data', {}).get('categoryList', [])
        
        # Recursively extract categories from the tree structure
        def extract_categories(node, parent_name=None, parent_id=None, level=1):
            """Recursively extract categories from category tree."""
            node_name = node.get('name', '')
            node_id = node.get('id')
            node_url_key = node.get('url_key', '')
            product_count = node.get('product_count', 0)
            children = node.get('children', [])
            
            # Only include level 4 categories (leaf nodes with products)
            # Level 1: Products
            # Level 2: Food, Beverages, etc.
            # Level 3: Bakery, Cheese, etc.
            # Level 4: Sliced Bread, Loaves, etc. (actual product categories)
            if level == 4 and node_id and product_count > 0:
                categories.append({
                    'name': node_name,
                    'parent': parent_name or '',
                    'id': str(node_id),  # Use numeric ID as string
                    'url_key': node_url_key,
                    'product_count': product_count,
                    'level': level
                })
            
            # Recursively process children
            for child in children:
                extract_categories(child, node_name, node_id, level + 1)
        
        # Process all top-level category trees
        for root_category in category_list:
            extract_categories(root_category)
        
        logger.info(f"Discovered {len(categories)} product categories from Trader Joe's API structure")
        return categories
    
    def _discover_categories_from_mapping(self) -> List[Dict[str, Any]]:
        """Fallback: Discover categories from TRADERJOES_CATEGORY_MAP."""
        logger.info("Using fallback category mapping...")
        categories = []
        
        for parent_name, subcategories in TRADERJOES_CATEGORY_MAP.items():
            for subcategory_name in subcategories.keys():
                category_id = (
                    subcategory_name.lower()
                    .replace(' ', '-')
                    .replace('&', 'and')
                    .replace(',', '')
                    .replace('/', '-')
                    .replace("'", '')
                )
                
                categories.append({
                    'name': subcategory_name,
                    'parent': parent_name,
                    'id': category_id,
                })
        
        return categories
    
    def scrape_category(self, category: Dict[str, Any]) -> int:
        """
        Scrape products from a category with pagination.
        
        Args:
            category: Category dictionary from discover_categories()
            
        Returns:
            Number of products scraped
        """
        category_name = category.get('name', 'Unknown')
        parent_name = category.get('parent', '')
        category_id = category.get('id')
        
        if not category_id:
            logger.warning(f"No category ID for {parent_name} > {category_name}, skipping")
            return 0
        
        logger.info(f"Scraping category: {parent_name} > {category_name} (ID: {category_id})")
        
        category_scraped = 0
        current_page = 1
        
        while True:
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                break
            
            # Rate limiting
            delay = self._get_random_delay()
            logger.debug(f"Waiting {delay:.2f}s before page {current_page}...")
            time.sleep(delay)
            
            # Make GraphQL request
            logger.info(f"  Fetching page {current_page}...")
            
            # Update referer to match the category being scraped
            self.client.session.headers['referer'] = f'https://www.traderjoes.com/home/products/category/{category_id}'
            
            # Build filter with category_id and availability
            # category_id uses FilterEqualTypeInput (has 'eq' field)
            filter_dict = {
                'availability': {'match': '1'}  # In stock items only
            }
            
            # Add category filter if we have a numeric category ID
            if category_id and category_id.isdigit():
                filter_dict['category_id'] = {'eq': category_id}
            elif category_id:
                # If category_id is not numeric, try to find it from url_key
                # For now, log a warning and search all products
                logger.warning(f"Category ID '{category_id}' is not numeric, searching all products")
            
            response = self.client.query(
                operation='SearchProducts',
                variables={
                    'filter': filter_dict,
                    'currentPage': current_page,
                    'pageSize': self.page_size
                }
            )
            
            if not response:
                logger.error(f"  Failed to fetch page {current_page}")
                if current_page == 1:
                    logger.warning(f"  Failed on first page, skipping category")
                break
            
            # Extract products from response
            products_data = response.get('products', {})
            products = products_data.get('items', [])
            total_count = products_data.get('total_count', 0)
            
            if current_page == 1 and total_count > 0:
                total_pages = (total_count + self.page_size - 1) // self.page_size
                logger.info(f"  Found {total_count} total products ({total_pages} pages)")
            
            if not products:
                logger.info(f"  No products found at page {current_page}, stopping")
                break
            
            logger.info(f"  Found {len(products)} products on page {current_page}")
            
            # Process each product
            for product in products:
                if self.max_items and self.scraped_count >= self.max_items:
                    break
                
                sku = product.get('sku')
                if not sku or sku in self.discovered_product_ids:
                    continue
                
                normalized = self.extract_product_data(product, category_name, parent_name)
                if normalized:
                    if self.dry_run:
                        logger.info(f"  [DRY-RUN] Would store product: {normalized.get('name', 'Unknown')} (SKU: {normalized.get('product_id', 'N/A')})")
                        category_scraped += 1
                        self.scraped_count += 1
                    else:
                        if self.store_product_in_supabase(normalized):
                            category_scraped += 1
                            self.scraped_count += 1
                        else:
                            self.failed_count += 1
                else:
                    self.failed_count += 1
            
            # Check if we should continue pagination
            if len(products) < self.page_size:
                # Last page (fewer items than page size)
                logger.info(f"  Reached last page ({total_count} total products)")
                break
            
            if current_page * self.page_size >= total_count:
                # Reached end based on total count
                logger.info(f"  Reached end of category ({total_count} total)")
                break
            
            current_page += 1
            
            # Periodic progress report
            if category_scraped > 0 and category_scraped % 50 == 0:
                logger.info(f"  Progress: {category_scraped} items scraped so far in this category")
        
        logger.info(f"  Category complete: {category_scraped} items scraped")
        return category_scraped
    
    def extract_product_data(self, product_data: Dict[str, Any], category_name: Optional[str] = None, parent_category: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Extract normalized product data for storage.
        
        Handles both basic product data (from GetAllProducts) and 
        enriched PDP data (from SearchProduct) with full field extraction.
        
        Args:
            product_data: Product dict from GraphQL response (basic or PDP)
            category_name: Category name override (optional, will use PDP hierarchy if available)
            parent_category: Parent category name override (optional)
            
        Returns:
            Normalized product dictionary with all required fields for source_products
        """
        try:
            sku = product_data.get('sku', '')
            if not sku:
                return None
            
            # Skip if already processed
            if sku in self.discovered_product_ids:
                return None
            
            item_title = product_data.get('item_title', '').strip()
            
            # Compute EAN-8 from SKU
            barcode = sku_to_ean8(sku)
            
            # Extract images (up to 10)
            image_urls = []
            
            # Primary image first (will be rank 0)
            primary_image = product_data.get('primary_image') or product_data.get('image_url')
            if primary_image:
                normalized_url = self._normalize_image_url(primary_image)
                if normalized_url and normalized_url not in image_urls:
                    image_urls.append(normalized_url)
            
            # Additional images from other_images
            additional_images = product_data.get('other_images', []) or product_data.get('images', [])
            if isinstance(additional_images, list):
                for img in additional_images:
                    url = self._extract_image_url(img)
                    if url and url not in image_urls:
                        image_urls.append(url)
                        if len(image_urls) >= 10:
                            break
            
            image_urls = image_urls[:10]
            
            # Trader Joe's doesn't have a brand field - most products are private label
            brand = "Trader Joe's"
            
            # ===== PDP-specific fields =====
            
            # Extract category hierarchy (from PDP data)
            category_hierarchy = product_data.get('category_hierarchy', [])
            extracted_category_name = category_name or ''
            extracted_parent_category = parent_category or ''
            full_category_hierarchy = []
            
            # TJ category hierarchy levels:
            # Level 1 = "Products" (root)
            # Level 2 = "Food", "Beverages" (broad categories)
            # Level 3 = "Cheese", "Meat, Seafood & Plant-based", "Coffee & Tea" (parent for mapping)
            # Level 4 = "Slices, Shreds, Crumbles", "Beef, Pork & Lamb" (subcategory for mapping)
            # 
            # TRADERJOES_CATEGORY_MAP expects:
            #   parent = level 3 name (e.g., "Cheese", "Beverages")
            #   category_path = level 4 name (e.g., "Slices, Shreds, Crumbles")
            # OR for beverages (which don't have level 4):
            #   parent = level 2 name (e.g., "Beverages")
            #   category_path = level 3 name (e.g., "Coffee & Tea")
            
            level_2_name = ''
            level_3_name = ''
            level_4_name = ''
            
            if category_hierarchy:
                for cat in sorted(category_hierarchy, key=lambda x: x.get('level', 0)):
                    full_category_hierarchy.append({
                        'id': cat.get('id'),
                        'name': cat.get('name'),
                        'level': cat.get('level'),
                        'url_key': cat.get('url_key')
                    })
                    
                    level = cat.get('level', 0)
                    cat_name = cat.get('name', '')
                    
                    if level == 2:
                        level_2_name = cat_name
                    elif level == 3:
                        level_3_name = cat_name
                    elif level == 4:
                        level_4_name = cat_name
                
                # Use level 4 if available (most specific), with level 3 as parent
                # Otherwise fall back to level 3 with level 2 as parent
                if level_4_name:
                    extracted_category_name = level_4_name
                    extracted_parent_category = level_3_name
                elif level_3_name:
                    extracted_category_name = level_3_name
                    extracted_parent_category = level_2_name if level_2_name != 'Food' else level_3_name
            
            # Extract description from item_story_marketing (clean HTML)
            description = self._clean_html(product_data.get('item_story_marketing'))
            
            # Build product page URL from item_title + SKU (NOT url_key)
            product_page_url = self._build_product_page_url(item_title, sku)
            
            # Parse country of origin
            origin_country = self._parse_country_of_origin(product_data.get('country_of_origin'))
            
            # Extract size fields
            sales_size = product_data.get('sales_size')
            size = str(sales_size) if sales_size is not None else None
            size_uom = product_data.get('sales_uom_description')
            
            # Build metadata with full PDP JSON
            metadata = {
                'pdp_data': product_data,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'scraper_version': '2.0'  # PDP enrichment version
            }
            
            return {
                # Core identifiers
                'product_id': sku,  # For BaseScraper compatibility
                'external_id': sku,  # SKU as external_id
                'name': item_title,
                'barcode': barcode,  # EAN-8 computed from SKU
                'upc': barcode,  # Also set upc for BaseScraper compatibility
                'brand': brand,
                
                # Pricing
                'cost_price': product_data.get('retail_price'),
                
                # Size
                'size': size,
                'size_uom': size_uom,
                
                # Images
                'image_url': image_urls[0] if image_urls else '',
                'image_urls': image_urls,
                
                # Category (for normalize_category in BaseScraper)
                'category_name': extracted_category_name,
                'parent_category': extracted_parent_category,
                'full_category_hierarchy': full_category_hierarchy,
                
                # PDP enrichment fields
                'description': description,
                'product_page_url': product_page_url,
                'origin_country': origin_country,
                'metadata': metadata,
                
                # Raw data (for debugging)
                'raw_data': product_data,
            }
            
        except Exception as e:
            logger.error(f"Error extracting product data: {e}", exc_info=True)
            return None
    
    def store_product_in_supabase(self, product: Dict[str, Any]) -> bool:
        """
        Store product in Supabase database with PDP enrichment fields and image handling.
        
        Overrides BaseScraper to handle:
        - Additional PDP fields (description, product_page_url, origin_country, metadata)
        - Medusa's image table
        
        Args:
            product: Normalized product dictionary from extract_product_data()
            
        Returns:
            True if successful, False otherwise
        """
        if self.dry_run:
            logger.info(f"  [DRY-RUN] Would store product: {product.get('name', 'Unknown')} (ID: {product.get('product_id', 'N/A')})")
            self.discovered_product_ids.add(product.get('product_id', ''))
            return True
        
        if not self.supabase_client:
            logger.warning("Supabase client not available - skipping product storage")
            return False
        
        try:
            from uuid import uuid4
            
            store_product_id = product.get('product_id') or product.get('external_id')
            barcode = product.get('barcode') or product.get('upc')
            
            # Find existing product by barcode
            product_uuid = None
            if barcode and len(barcode) >= 6:
                existing_result = self.supabase_client.table('source_products').select('id, name, category_id').eq('barcode', barcode).limit(1).execute()
                if existing_result.data:
                    product_uuid = existing_result.data[0]['id']
            
            # Normalize category using TJ hierarchy and TRADERJOES_CATEGORY_MAP
            category_name = product.get('category_name', '')
            parent_category = product.get('parent_category')
            goods_category_slug = self.normalize_category(category_name, parent_category)
            
            # Get category IDs from Supabase using new slug-based lookup
            category_id = None
            subcategory_id = None
            
            if goods_category_slug and goods_category_slug != 'uncategorized':
                from scrapers.category_lookup import resolve_category_ids_from_slug
                category_id, subcategory_id = resolve_category_ids_from_slug(self.supabase_client, goods_category_slug)
                if category_id:
                    logger.debug(f"Mapped '{parent_category} > {category_name}' -> slug '{goods_category_slug}' -> category_id={category_id}, subcategory_id={subcategory_id}")
                else:
                    logger.debug(f"Could not resolve category slug '{goods_category_slug}' for '{parent_category} > {category_name}'")
            
            # Prepare full category hierarchy as JSON string
            full_category_hierarchy = None
            if product.get('full_category_hierarchy'):
                full_category_hierarchy = json.dumps(product['full_category_hierarchy'])
            
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
                
                # Generate handle from name
                if product.get('name'):
                    product_update['handle'] = self._generate_handle(product['name'])
                
                # Category fields (only update if not already set)
                if category_id and not existing_result.data[0].get('category_id'):
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
                if product.get('origin_country'):
                    product_update['origin_country'] = product['origin_country']
                if product.get('metadata'):
                    product_update['metadata'] = product['metadata']
                if full_category_hierarchy:
                    product_update['full_category_hierarchy'] = full_category_hierarchy
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
                
                # Generate handle from name
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
                if product.get('origin_country'):
                    product_data['origin_country'] = product['origin_country']
                if product.get('metadata'):
                    product_data['metadata'] = product['metadata']
                if full_category_hierarchy:
                    product_data['full_category_hierarchy'] = full_category_hierarchy
                if product.get('raw_data'):
                    product_data['raw_data'] = product['raw_data']
                
                result = self.supabase_client.table('source_products').insert(product_data).execute()
                if result.data:
                    product_uuid = product_data['id']
                    logger.debug(f"Created product {product['name']} (ID: {product_uuid})")
            
            if product_uuid:
                # Get stock_location_id and retailer_location_id
                stock_location_id = self._get_stock_location_id(self.retailer_name)
                retailer_location_id = self.store_code or 'TJ'  # Trader Joe's store code (e.g., "TJ")
                
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
                
                # Insert pricing record to goods_retailer_pricing
                if product.get('cost_price') or product.get('price'):
                    price_value = product.get('cost_price') or product.get('price')
                    pricing_record = {
                        'product_id': product_uuid,
                        'store_name': self.retailer_name,
                        'location_id': retailer_location_id,  # Keep for backward compatibility
                        'retailer_location_id': retailer_location_id,
                        'list_price': float(product.get('list_price')) if product.get('list_price') else None,
                        'sale_price': float(product.get('sale_price')) if product.get('sale_price') else None,
                        'is_on_sale': product.get('is_on_sale', False),
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
                    except Exception as e:
                        # If duplicate key error, that's okay - price already recorded for this effective_from
                        if 'duplicate key' not in str(e).lower() and 'unique constraint' not in str(e).lower():
                            raise  # Re-raise if it's a different error
                        logger.debug(f"Price record already exists for product {product_uuid} at {retailer_location_id} on {pricing_record['effective_from']}")
                
                # Store images in Medusa's image table
                self._store_product_images(product)
            
            self.discovered_product_ids.add(store_product_id)
            return True
            
        except Exception as e:
            logger.error(f"Error storing product {product.get('product_id', 'unknown')}: {e}", exc_info=True)
            return False
    
    def _store_product_images(self, product: Dict[str, Any]) -> None:
        """
        Store product images in Medusa's image table.
        
        Args:
            product: Normalized product dictionary
        """
        try:
            image_urls = product.get('image_urls', [])
            if not image_urls:
                logger.debug(f"No images to store for product {product.get('external_id', 'N/A')}")
                return
            
            # Get product UUID from source_products
            barcode = product.get('barcode') or product.get('upc')
            if not barcode:
                logger.warning("No barcode found for product, cannot store images")
                return
            
            # Find product by barcode
            product_result = self.supabase_client.table('source_products').select('id').eq('barcode', barcode).limit(1).execute()
            if not product_result.data:
                logger.warning(f"Product not found for barcode {barcode}, cannot store images")
                return
            
            product_id = product_result.data[0]['id']
            
            # Check existing images to avoid duplicates
            existing_result = self.supabase_client.table('image').select('url').eq('product_id', product_id).execute()
            existing_urls = {img['url'] for img in (existing_result.data or [])}
            
            logger.debug(f"Product {product.get('external_id', 'N/A')}: {len(image_urls)} images extracted, {len(existing_urls)} already exist")
            
            # Prepare new images
            import uuid
            from datetime import datetime, timezone
            
            new_images = []
            for rank, url in enumerate(image_urls[:10]):  # Limit to 10 images
                if url and url not in existing_urls:
                    new_images.append({
                        'id': f'img_{uuid.uuid4().hex[:24]}',  # Medusa-style ID with img_ prefix
                        'url': url,
                        'rank': rank,  # 0 = primary, 1+ = additional
                        'product_id': product_id,
                        'metadata': {
                            'source': self.retailer_name,
                            'scraped_at': datetime.now(timezone.utc).isoformat()
                        },
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })
            
            if new_images:
                # Insert new images (duplicates are prevented by checking existing_urls above)
                # If there's a unique constraint violation, it will be caught and logged
                try:
                    self.supabase_client.table('image').insert(new_images).execute()
                    logger.info(f"✅ Stored {len(new_images)} images for product {product.get('external_id', 'N/A')} (product_id: {product_id})")
                except Exception as insert_error:
                    # If there's a constraint violation, try inserting one at a time
                    # This handles race conditions where images might be added between check and insert
                    stored_count = 0
                    for img in new_images:
                        try:
                            self.supabase_client.table('image').insert(img).execute()
                            stored_count += 1
                        except Exception as e:
                            # Log but skip duplicates
                            logger.debug(f"Skipping duplicate image {img['url']}: {e}")
                            pass
                    if stored_count > 0:
                        logger.info(f"✅ Stored {stored_count} images for product {product.get('external_id', 'N/A')} ({len(new_images) - stored_count} were duplicates)")
            else:
                logger.debug(f"All {len(image_urls)} images already exist for product {product.get('external_id', 'N/A')}")
        
        except Exception as e:
            logger.error(f"Error storing product images: {e}", exc_info=True)
            # Don't fail the whole operation for image errors


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Scrape Trader Joe\'s products using GraphQL API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scrapers/trader_joes_scraper.py --no-dry-run
  python3 scrapers/trader_joes_scraper.py --max-items 100
  python3 scrapers/trader_joes_scraper.py --delay 1.5
        """
    )
    
    parser.add_argument(
        '--store-code',
        default=os.getenv('TRADER_JOES_STORE_CODE', 'TJ'),
        help='Trader Joe\'s store code (default: TJ)'
    )
    
    parser.add_argument(
        '--cookies',
        default=os.getenv('TRADER_JOES_COOKIES'),
        help='Cookie string from browser (or set TRADER_JOES_COOKIES env var)'
    )
    
    parser.add_argument(
        '--cookies-file',
        type=str,
        help='Path to file containing cookies (alternative to --cookies)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=TraderJoesScraper.DEFAULT_DELAY,
        help=f'Base delay between requests in seconds (default: {TraderJoesScraper.DEFAULT_DELAY})'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=TraderJoesScraper.DEFAULT_DELAY_VARIANCE,
        help=f'Random variance in delay in seconds (default: {TraderJoesScraper.DEFAULT_DELAY_VARIANCE})'
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
    
    # Handle dry-run flag (default True, can be disabled with --no-dry-run)
    dry_run = not args.no_dry_run
    
    # Load cookies from file if provided
    cookies = args.cookies
    if args.cookies_file:
        try:
            # Try to read as JSON first (for structured cookie files)
            try:
                import json
                with open(args.cookies_file, 'r') as f:
                    data = json.load(f)
                    # Extract cookies from JSON structure
                    if isinstance(data, dict):
                        cookies = data.get('cookies') or data.get('cookie') or data.get('cookie_string')
                    else:
                        cookies = data
            except (json.JSONDecodeError, ValueError):
                # If not JSON, read as plain text
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
    logger.info("TRADER JOE'S SCRAPER CONFIGURATION")
    logger.info("=" * 60)
    logger.info(f"Store Code: {args.store_code}")
    logger.info(f"Dry Run: {dry_run}")
    logger.info(f"Max Items: {args.max_items or 'Unlimited'}")
    logger.info(f"Cookies: {'Provided' if cookies else 'Will establish session'}")
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
    scraper = TraderJoesScraper(
        store_code=args.store_code,
        cookies=cookies,
        dry_run=dry_run,
        rate_limit_delay=args.delay,
        rate_limit_variance=args.delay_variance,
        max_items=args.max_items
    )
    
    # Run scraper with error handling
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
    print(f"Store Code: {args.store_code}")
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

