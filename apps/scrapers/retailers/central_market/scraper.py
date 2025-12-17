#!/usr/bin/env python3
"""
Central Market Scraper

Scrapes product data from Central Market (centralmarket.com) using the same
approach as HEB - session-based requests with proper headers.

Per RETAILER_SCRAPING_GUIDE.md:
- Type: GraphQL (HEB backend)
- Base URL: https://www.centralmarket.com/_next/data/
- UPC available via PDP (sku field)
"""

import os
import sys
import json
import re
import time
import logging
import random
import argparse
import requests
from typing import Dict, List, Optional, Any
from requests.adapters import HTTPAdapter

try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.base_scraper import BaseScraper

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CentralMarketScraper(BaseScraper):
    """
    Central Market scraper using session-based requests (same approach as HEB).
    
    Field Mapping (per RETAILER_SCRAPING_GUIDE.md):
    
    | API Field | Goods Schema Field | Notes |
    |-----------|-------------------|-------|
    | productId | external_id | Central Market product ID |
    | sku | barcode | UPC (from PDP) |
    | description | name | Product name |
    | brand.name | brand | Brand name |
    | currentPrice.amount | cost_price | Current price |
    | originalPrice.amount | list_price | Regular price |
    | unitListPrice.amount | price_per_unit | Price per unit |
    | unitListPrice.unit | price_per_unit_uom | Unit of measure |
    | image.url | image_url | Product image |
    | aisle_location | store_location | Aisle info |
    | category.name | category | Category name |
    """
    
    BASE_URL = "https://www.centralmarket.com"
    DEFAULT_STORE_ID = "61"  # Austin - North Lamar
    
    # Central Market Store IDs
    STORES = {
        "55": "Dallas - Lovers Lane",
        "61": "Austin - North Lamar",
        "191": "Houston - Westheimer",
        "420": "Fort Worth",
        "491": "Southlake",
        "545": "Plano",
        "546": "Dallas - Preston Royal",
        "552": "San Antonio",
        "653": "Austin - Westgate",
        "747": "Houston - Midlane",
    }
    
    def __init__(
        self,
        store_id: Optional[str] = None,
        cookies: Optional[str] = None,
        delay: float = 2.0,
        dry_run: bool = False,
        **kwargs
    ):
        """
        Initialize Central Market scraper.
        
        Args:
            store_id: Central Market store ID (default: 61 - Austin North Lamar)
            cookies: Cookie string for authenticated requests (optional, uses cookie manager if not provided)
            delay: Delay between requests in seconds
            dry_run: If True, skip Supabase storage
        """
        super().__init__(
            retailer_name='central_market',
            store_id=store_id or self.DEFAULT_STORE_ID,
            dry_run=dry_run,
            rate_limit_delay=delay,
            **kwargs
        )
        
        self.delay = delay
        self.build_id = None  # Next.js build ID
        self._session_established = False
        
        # Initialize cookie manager
        from scrapers.central_market.cookie_manager import get_cookie_manager
        self.cookie_manager = get_cookie_manager(store_id=self.store_id)
        
        # If cookies provided explicitly, update the manager
        if cookies:
            self.cookie_manager.update_cookies(cookies)
        
        # Create session with retry strategy (same as HEB)
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Parse cookies if provided
        if cookies:
            cookie_jar = requests.cookies.RequestsCookieJar()
            for cookie in cookies.split(';'):
                cookie = cookie.strip()
                if '=' in cookie:
                    key, value = cookie.split('=', 1)
                    cookie_jar.set(key.strip(), value.strip(), domain='.centralmarket.com', path='/')
            self.session.cookies.update(cookie_jar)
            logger.debug(f"Set {len(cookie_jar)} cookies in session")
        
        logger.info(f"Initialized Central Market scraper (store_id: {self.store_id})")
    
    def _establish_session(self):
        """
        Establish session by visiting main page first.
        Uses cookie manager for automatic cookie handling.
        
        NOTE: Central Market uses Incapsula which requires real browser cookies.
        If blocked, you need to provide fresh cookies via CENTRAL_MARKET_COOKIES env var.
        """
        if self._session_established:
            return
        
        try:
            logger.debug("Establishing session with Central Market...")
            
            # Get cookies from manager
            cookies = self.cookie_manager.get_cookies()
            
            if not cookies:
                logger.error("No cookies available - cannot establish session")
                return
            
            # Browser-like headers
            headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.6',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Sec-GPC': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            }
            
            # Apply cookies to session
            self.session.cookies.update(cookies)
            
            # Visit main page
            response = self.session.get(self.BASE_URL, headers=headers, timeout=15, allow_redirects=True)
            
            # Check for blocking
            if response.status_code == 403 or 'Pardon Our Interruption' in response.text:
                logger.warning("Blocked on session establishment")
                self.cookie_manager.handle_blocked_response(response)
                # Even if refresh fails, continue - we'll handle blocking in individual requests
            
            # Update cookie manager with any new cookies from response
            new_cookies = self.session.cookies.get_dict()
            if new_cookies:
                for k, v in new_cookies.items():
                    self.cookie_manager.cookies[k] = v
                self.cookie_manager._save_cookies()
            
            # Extract build ID if response was successful
            if response.status_code == 200 and 'Pardon Our Interruption' not in response.text:
                self.build_id = self._extract_build_id(response.text)
                if self.build_id:
                    logger.debug(f"Extracted build_id: {self.build_id}")
            
            time.sleep(random.uniform(0.5, 1.0))
            
            self._session_established = True
            logger.info("Session established successfully")
            
        except Exception as e:
            logger.warning(f"Session establishment error: {e}")
    
    def _extract_build_id(self, html: str) -> Optional[str]:
        """Extract Next.js build ID from page HTML."""
        # Try _next/data pattern
        match = re.search(r'/_next/data/([a-zA-Z0-9_-]{20,})/', html)
        if match:
            return match.group(1)
        
        # Try __NEXT_DATA__ buildId
        match = re.search(r'"buildId":\s*"([^"]+)"', html)
        if match:
            return match.group(1)
        
        return None
    
    def _get_request_headers(self, referer: Optional[str] = None) -> Dict[str, str]:
        """Get headers for requests."""
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.6',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin' if referer else 'none',
            'Sec-Fetch-User': '?1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        }
        
        if referer:
            headers['Referer'] = referer
        
        # Cookies are now managed via session cookies, not header
        # This allows the cookie manager to handle refresh automatically
            
        return headers
    
    def _get_nextjs_data(self, path: str) -> Optional[Dict]:
        """
        Get data from Next.js Data API.
        
        Per docs: GET https://www.centralmarket.com/_next/data/{build_id}/{path}
        """
        self._establish_session()
        
        if not self.build_id:
            logger.warning("No build_id available, cannot use Next.js Data API")
            return None
        
        url = f"{self.BASE_URL}/_next/data/{self.build_id}/{path}"
        headers = self._get_request_headers(referer=self.BASE_URL)
        headers['Accept'] = 'application/json'
        # Don't set purpose: prefetch - returns empty response per docs
        
        time.sleep(random.uniform(0.2, 0.5))
        
        try:
            response = self.session.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Next.js Data API returned {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Next.js Data API error: {e}")
            return None
    
    def _scrape_html_page(self, url: str, retry_on_block: bool = True) -> Optional[Dict]:
        """
        Scrape HTML page and extract __NEXT_DATA__.
        Automatically handles blocked responses by refreshing cookies.
        
        Args:
            url: URL to scrape
            retry_on_block: Whether to retry with fresh cookies if blocked
        """
        self._establish_session()
        
        headers = self._get_request_headers(referer=self.BASE_URL)
        time.sleep(random.uniform(0.2, 0.5))
        
        try:
            response = self.session.get(url, headers=headers, timeout=15)
            
            # Check for blocking
            is_blocked = (
                response.status_code == 403 or
                'Pardon Our Interruption' in response.text or
                'incapsula' in response.text.lower()
            )
            
            if is_blocked and retry_on_block:
                logger.warning("Blocked by Incapsula, refreshing cookies...")
                if self.cookie_manager.handle_blocked_response(response):
                    # Update session with new cookies
                    cookies = self.cookie_manager.get_cookies(force_refresh=True)
                    self.session.cookies.clear()
                    self.session.cookies.update(cookies)
                    self._session_established = False  # Force re-establishment
                    
                    # Retry once
                    return self._scrape_html_page(url, retry_on_block=False)
                else:
                    logger.error("Could not recover from block")
                    return None
            
            if response.status_code != 200:
                logger.warning(f"Page request failed: {response.status_code}")
                return None
            
            # Extract __NEXT_DATA__
            match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', response.text, re.DOTALL)
            if match:
                # Update cookies from response
                new_cookies = self.session.cookies.get_dict()
                if new_cookies:
                    for k, v in new_cookies.items():
                        self.cookie_manager.cookies[k] = v
                
                return json.loads(match.group(1))
            
            # Update build_id if found
            new_build_id = self._extract_build_id(response.text)
            if new_build_id and new_build_id != self.build_id:
                logger.info(f"Updated build_id: {new_build_id}")
                self.build_id = new_build_id
            
            logger.warning("Could not find __NEXT_DATA__ in HTML")
            return None
            
        except Exception as e:
            logger.error(f"HTML scrape error: {e}")
            return None
    
    def search(self, query: str = "", category_id: Optional[str] = None, page: int = 1) -> List[Dict]:
        """
        Search for products (single page).
        
        Args:
            query: Search query string
            category_id: Category ID path (e.g., "483475.483627")
            page: Page number (1-indexed)
            
        Returns:
            List of raw product dictionaries
        """
        if query:
            url = f"{self.BASE_URL}/search?q={requests.utils.quote(query)}"
            if page > 1:
                url += f"&page={page}"
            logger.info(f"Searching: {url}")
            data = self._scrape_html_page(url)
            
            if not data:
                return []
            
            # Extract products from pageProps.products (search results)
            page_props = data.get('props', {}).get('pageProps', {})
            products = page_props.get('products', [])
            
        elif category_id:
            # Use product-category URL format for browsing
            # URL: /product-category/{slug}/{id_path}?page=N
            url = f"{self.BASE_URL}/product-category/browse/{category_id}"
            if page > 1:
                url += f"?page={page}"
            logger.info(f"Browsing category: {url}")
            data = self._scrape_html_page(url)
            
            if not data:
                return []
            
            # Extract products from queryClientState.infiniteProductBrowse
            page_props = data.get('props', {}).get('pageProps', {})
            products = self._extract_browse_products(page_props)
            
        else:
            logger.error("Either query or category_id required")
            return []
        
        logger.info(f"Found {len(products)} products on page {page}")
        return products
    
    def _extract_browse_products(self, page_props: Dict) -> List[Dict]:
        """
        Extract products from infiniteProductBrowse in queryClientState.
        
        The product data is in:
        queryClientState.queries[where queryHash contains 'infiniteProductBrowse'].state.data.pages[].products
        """
        qcs = page_props.get('queryClientState', {})
        queries = qcs.get('queries', [])
        
        for q in queries:
            query_hash = q.get('queryHash', '')
            if 'infiniteProductBrowse' in str(query_hash):
                state = q.get('state', {})
                data_content = state.get('data', {})
                pages = data_content.get('pages', [])
                
                all_products = []
                for page in pages:
                    products = page.get('products', [])
                    all_products.extend(products)
                
                return all_products
        
        return []
    
    def search_all_pages(self, query: str = "", category_id: Optional[str] = None, max_pages: int = 50) -> List[Dict]:
        """
        Search for products across ALL pages.
        
        Args:
            query: Search query string
            category_id: Category ID (numeric)
            max_pages: Maximum pages to fetch (safety limit)
            
        Returns:
            List of all raw product dictionaries
        """
        all_products = []
        page = 1
        
        while page <= max_pages:
            products = self.search(query=query, category_id=category_id, page=page)
            
            if not products:
                break
                
            all_products.extend(products)
            
            # Central Market returns 60 per page
            if len(products) < 60:
                break
            
            page += 1
            time.sleep(self.delay)
        
        logger.info(f"Total: {len(all_products)} products across {page} pages")
        return all_products
    
    # ========== GraphQL API for UPC ==========
    
    GRAPHQL_URL = "https://services.centralmarket.com/cm-graphql-service/"
    
    def get_products_graphql(self, product_ids: List[str], batch_size: int = 100) -> Dict[str, Dict]:
        """
        Batch get product data via Central Market's GraphQL API.
        
        Automatically chunks large requests to avoid timeouts.
        
        Args:
            product_ids: List of product IDs (numeric strings)
            batch_size: Max products per GraphQL request (default: 100)
            
        Returns:
            Dict mapping product_id -> product data with upc, brand, etc.
        """
        if not product_ids:
            return {}
        
        # Convert to integers
        int_ids = []
        for pid in product_ids:
            try:
                int_ids.append(int(pid))
            except ValueError:
                logger.warning(f"Invalid product_id: {pid}")
        
        if not int_ids:
            return {}
        
        query = """
        query GetProducts($productIds: [Int!]!) {
            products(productIds: $productIds) {
                product_id
                upc
                brand
                title
                description
                base_image_url
                sold_by
                categories {
                    name
                    id
                }
                price_locations {
                    store_id
                    in_assortment
                }
            }
        }
        """
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Origin': 'https://www.centralmarket.com',
        }
        
        # Process in batches
        all_results = {}
        total_batches = (len(int_ids) + batch_size - 1) // batch_size
        
        for i in range(0, len(int_ids), batch_size):
            batch = int_ids[i:i + batch_size]
            batch_num = i // batch_size + 1
            
            payload = {
                "query": query,
                "variables": {"productIds": batch}
            }
            
            try:
                response = self.session.post(
                    self.GRAPHQL_URL,
                    json=payload,
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check for errors
                    if 'errors' in data:
                        logger.warning(f"GraphQL errors in batch {batch_num}: {data['errors']}")
                        continue
                    
                    products = data.get('data', {}).get('products', []) or []
                    
                    # Map by product_id for easy lookup
                    for p in products:
                        if p:
                            pid = p.get('product_id')
                            if pid:
                                all_results[str(pid)] = p
                    
                    if total_batches > 1:
                        logger.debug(f"GraphQL batch {batch_num}/{total_batches}: {len(products)} products")
                else:
                    logger.warning(f"GraphQL error in batch {batch_num}: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"GraphQL batch {batch_num} failed: {e}")
            
            # Small delay between batches
            if i + batch_size < len(int_ids):
                time.sleep(0.5)
        
        logger.info(f"GraphQL returned {len(all_results)} products")
        return all_results
    
    def _format_upc(self, upc_value: Any) -> Optional[str]:
        """
        Format UPC value to standard 12-digit UPC-A string.
        
        The GraphQL API returns UPC as an integer which may be
        truncated (missing leading zeros or check digit).
        """
        if upc_value is None:
            return None
        
        upc_str = str(upc_value)
        
        # Pad to 12 digits if shorter (UPC-A standard)
        if len(upc_str) < 12:
            upc_str = upc_str.zfill(12)
        
        return upc_str
    
    def extract_product_data(self, product: Dict) -> Dict[str, Any]:
        """
        Normalize product data to Goods schema.
        
        Per RETAILER_SCRAPING_GUIDE.md field mapping for Central Market.
        """
        # Extract price (search: amount, PDP: currentPrice.amount)
        cost_price = product.get('amount') or product.get('price')
        if not cost_price:
            current_price = product.get('currentPrice', {})
            if isinstance(current_price, dict):
                cost_price = current_price.get('amount')
            else:
                cost_price = current_price
        
        # List price (regular price when on sale)
        list_price_str = product.get('listPrice', '')
        list_price = None
        if list_price_str and isinstance(list_price_str, str):
            match = re.search(r'\$?([\d.]+)', list_price_str)
            if match:
                list_price = float(match.group(1))
        elif isinstance(list_price_str, (int, float)):
            list_price = float(list_price_str)
        
        # Skip list_price if same as cost_price
        if list_price and cost_price and abs(list_price - cost_price) < 0.01:
            list_price = None
        
        # Unit price (per RETAILER_SCRAPING_GUIDE.md: unitListPrice.amount/unit)
        price_per_unit = None
        price_per_unit_uom = None
        
        unit_list_price = product.get('unitListPrice', {})
        if unit_list_price and isinstance(unit_list_price, dict):
            price_per_unit = unit_list_price.get('amount')
            price_per_unit_uom = unit_list_price.get('unit')
        
        # Fallback: eawtDetails (Each at Weight)
        if not price_per_unit:
            eawt = product.get('eawtDetails', {})
            if eawt:
                price_per_unit = eawt.get('amount')
                price_per_unit_uom = eawt.get('uom')
        
        # Fallback: priceUom for weight-sold items
        if not price_per_unit:
            price_uom = product.get('priceUom', '')
            if price_uom and price_uom != 'ea':
                price_per_unit = cost_price
                price_per_unit_uom = price_uom
        
        # Extract category
        category_path = product.get('categoryPath', [])
        category = category_path[0].get('name') if category_path else None
        subcategory = category_path[-1].get('name') if len(category_path) > 1 else None
        
        # Extract brand (per docs: brand.name)
        brand = product.get('brand')
        if isinstance(brand, dict):
            brand = brand.get('name')
        
        # Image URL (per docs: image.url)
        image_url = product.get('baseImageUrl')
        if not image_url:
            image = product.get('image', {})
            if isinstance(image, dict):
                image_url = image.get('url')
            else:
                image_url = image
        
        return {
            # Required Goods Schema Fields
            'external_id': str(product.get('productId')),
            'barcode': product.get('sku'),  # UPC - requires PDP fetch
            'name': product.get('title') or product.get('description'),
            'brand': brand,
            'cost_price': cost_price,
            'list_price': list_price,
            'price_per_unit': price_per_unit,
            'price_per_unit_uom': price_per_unit_uom,
            'image_url': image_url,
            'store_location': product.get('aisle_location'),
            'category': category,
            'subcategory': subcategory,
            
            # Additional fields
            'description': product.get('description'),
            'sold_by': product.get('soldBy'),
            'is_available': product.get('isAvailable', True),
            'is_on_sale': product.get('isOnSale', False),
            'snap_eligible': product.get('isSnapEligible'),
            'category_id_path': product.get('categoryIdPath'),
        }
    
    def enrich_products_batch(self, products: List[Dict], filter_store: bool = True) -> List[Dict]:
        """
        Batch enrich ALL products with UPC via a single GraphQL call.
        
        This is extremely efficient - one API call for all products!
        Also enriches brand (often null in search) and checks store availability.
        
        Args:
            products: List of normalized products from search
            filter_store: If True, only return products available at self.store_id
            
        Returns:
            Products with barcode, brand, etc. populated
        """
        if not products:
            return products
        
        # Get all product IDs
        product_ids = [p.get('external_id') for p in products if p.get('external_id')]
        
        if not product_ids:
            return products
        
        logger.info(f"Enriching {len(product_ids)} products via GraphQL batch...")
        
        # Single GraphQL call for ALL products
        graphql_data = self.get_products_graphql(product_ids)
        
        # Enrich each product
        upc_count = 0
        brand_count = 0
        store_id_int = int(self.store_id) if self.store_id else 61
        
        enriched_products = []
        for product in products:
            pid = product.get('external_id')
            if pid and pid in graphql_data:
                gql_product = graphql_data[pid]
                
                # Get UPC
                upc = gql_product.get('upc')
                if upc:
                    product['barcode'] = self._format_upc(upc)
                    upc_count += 1
                
                # ALWAYS set brand from GraphQL (more reliable than search)
                gql_brand = gql_product.get('brand')
                if gql_brand:
                    product['brand'] = gql_brand
                    brand_count += 1
                
                # Get image if missing
                if not product.get('image_url') and gql_product.get('base_image_url'):
                    product['image_url'] = gql_product['base_image_url']
                
                # Check store availability
                price_locations = gql_product.get('price_locations', [])
                in_assortment = False
                for loc in price_locations:
                    if loc.get('store_id') == store_id_int:
                        in_assortment = loc.get('in_assortment', False)
                        break
                
                product['in_assortment_at_store'] = in_assortment
                product['store_id'] = store_id_int
                
                # Only include if in assortment at selected store (or no filter)
                if not filter_store or in_assortment:
                    enriched_products.append(product)
            else:
                # No GraphQL data - include anyway if not filtering
                if not filter_store:
                    enriched_products.append(product)
        
        logger.info(f"Enriched: {upc_count} UPCs, {brand_count} brands")
        if filter_store:
            logger.info(f"Filtered to {len(enriched_products)}/{len(products)} products available at store {store_id_int}")
        
        return enriched_products
    
    def scrape_search_with_upc(
        self,
        query: str = "",
        category_id: Optional[str] = None,
    ) -> List[Dict]:
        """
        Scrape search results AND fetch UPC via GraphQL batch.
        
        This is extremely efficient - uses a single GraphQL call
        to get UPC for ALL products!
        
        Args:
            query: Search query
            category_id: Category ID
            
        Returns:
            List of products with UPC barcodes
        """
        # Get search results (includes pricing)
        raw_products = self.search(query=query, category_id=category_id)
        
        # Normalize
        products = [self.extract_product_data(p) for p in raw_products]
        
        # Single batch call to get ALL UPCs
        products = self.enrich_products_batch(products)
        
        return products
    
    # ==================== BaseScraper Interface ====================
    
    # Top-level grocery categories (from Central Market homepage)
    TOP_CATEGORIES = {
        'fresh-produce': {'id': '483475', 'name': 'Fresh Produce', 'url': 'fresh-produce'},
        'butcher-shop': {'id': '1246473', 'name': 'Butcher Shop', 'url': 'butcher-shop'},
        'seafood': {'id': '1210269', 'name': 'Seafood', 'url': 'seafood'},
        'grocery-and-staples': {'id': '483476', 'name': 'Grocery & Staples', 'url': 'grocery-and-staples'},
        'bulk-foods': {'id': '1547011', 'name': 'Bulk Foods', 'url': 'bulk-foods'},
        'dairy': {'id': '483468', 'name': 'Dairy & Eggs', 'url': 'dairy'},
        'chef-prepared': {'id': '483467', 'name': 'Chef Prepared', 'url': 'chef-prepared'},
        'deli-meats': {'id': '1309768', 'name': 'Deli Meats', 'url': 'deli-meats'},
        'cheese': {'id': '483466', 'name': 'Cheese', 'url': 'cheese'},
        'bakery': {'id': '483465', 'name': 'Bakery', 'url': 'bakery'},
        'frozen': {'id': '483471', 'name': 'Frozen', 'url': 'frozen'},
        'beverages': {'id': '1174535', 'name': 'Beverages', 'url': 'beverages'},
        'kids-and-baby': {'id': '1329930', 'name': 'Kids & Baby', 'url': 'kids-and-baby'},
    }
    
    # Excluded categories (non-grocery)
    EXCLUDED_CATEGORIES = {'beer-and-wine', 'floral', 'health-and-beauty', 'household'}
    
    def _get_leaf_categories(self, category_tree: Dict, parent_name: str = None) -> List[Dict]:
        """
        Recursively extract leaf categories from a category tree.
        
        Args:
            category_tree: Category dict with potential 'categories' children
            parent_name: Parent category name for mapping
            
        Returns:
            List of leaf category dicts with id, name, parent
        """
        leaves = []
        cat_id = category_tree.get('id')
        cat_name = category_tree.get('name')
        children = category_tree.get('categories', [])
        
        if not children:
            # This is a leaf node
            leaves.append({
                'id': cat_id,
                'name': cat_name,
                'parent': parent_name,
                'id_path': category_tree.get('idPath', cat_id)
            })
        else:
            # Recurse into children
            for child in children:
                leaves.extend(self._get_leaf_categories(child, parent_name=parent_name or cat_name))
        
        return leaves
    
    def discover_categories(self, include_all: bool = True) -> List[Dict[str, Any]]:
        """
        Discover ALL grocery categories by crawling category pages.
        
        Args:
            include_all: If True, fetch full category tree from website.
                        If False, return only top-level categories.
        
        Returns:
            List of category dicts with id, name, parent
        """
        if not include_all:
            return [
                {'id': c['id'], 'name': c['name'], 'parent': None}
                for c in self.TOP_CATEGORIES.values()
            ]
        
        all_leaves = []
        
        for key, cat_info in self.TOP_CATEGORIES.items():
            if key in self.EXCLUDED_CATEGORIES:
                continue
                
            cat_id = cat_info['id']
            cat_name = cat_info['name']
            cat_url = cat_info['url']
            
            logger.info(f"Discovering subcategories for: {cat_name}")
            
            # Fetch category page to get subcategory tree
            url = f"{self.BASE_URL}/product-category/{cat_url}/{cat_id}"
            data = self._scrape_html_page(url)
            
            if not data:
                # Fallback: use the top-level category itself
                all_leaves.append({
                    'id': cat_id,
                    'name': cat_name,
                    'parent': None,
                    'id_path': cat_id
                })
                continue
            
            page_props = data.get('props', {}).get('pageProps', {})
            category = page_props.get('category', {})
            
            # Extract leaf categories
            leaves = self._get_leaf_categories(category, parent_name=cat_name)
            all_leaves.extend(leaves)
            
            time.sleep(1)  # Be polite
        
        logger.info(f"Discovered {len(all_leaves)} leaf categories")
        return all_leaves
    
    def scrape_category(self, category: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scrape all products from a category (all pages)."""
        cat_id = category.get('id')
        return self.search_all_pages(category_id=cat_id)
    
    def run_full_scrape(self, batch_size: int = 100, save_progress: bool = True) -> Dict[str, Any]:
        """
        Run a full scrape of ALL Central Market products.
        
        This method:
        1. Discovers all leaf categories
        2. Scrapes each category with pagination
        3. Enriches with UPC/brand via GraphQL batch
        4. Stores to Supabase (upsert to avoid duplicates)
        
        Args:
            batch_size: Number of products to process before enriching/storing
            save_progress: Whether to save progress to a JSON file
            
        Returns:
            Stats dict with counts
        """
        stats = {
            'categories_scraped': 0,
            'products_scraped': 0,
            'products_enriched': 0,
            'products_stored': 0,
            'errors': []
        }
        
        # Discover categories
        logger.info("=== Discovering Categories ===")
        categories = self.discover_categories(include_all=True)
        logger.info(f"Found {len(categories)} categories to scrape")
        
        all_products = []
        seen_ids = set()  # Track duplicates
        
        for i, category in enumerate(categories, 1):
            cat_id = category.get('id')
            cat_name = category.get('name')
            parent_name = category.get('parent', 'Unknown')
            
            logger.info(f"\n=== [{i}/{len(categories)}] {parent_name} > {cat_name} ===")
            
            try:
                # Scrape all pages for this category
                raw_products = self.search_all_pages(category_id=cat_id)
                
                # Normalize and deduplicate
                for raw in raw_products:
                    product = self.extract_product_data(raw)
                    pid = product.get('external_id')
                    
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        # Add category info for mapping
                        product['_parent_category'] = parent_name
                        product['_subcategory'] = cat_name
                        all_products.append(product)
                
                stats['categories_scraped'] += 1
                stats['products_scraped'] = len(all_products)
                
                # Batch enrich and store periodically
                if len(all_products) >= batch_size:
                    self._process_batch(all_products, stats)
                    all_products = []
                
            except Exception as e:
                logger.error(f"Error scraping {cat_name}: {e}")
                stats['errors'].append(f"{cat_name}: {str(e)}")
            
            # Be nice to the server
            time.sleep(self.delay)
        
        # Process remaining products
        if all_products:
            self._process_batch(all_products, stats)
        
        # Final summary
        logger.info("\n" + "=" * 60)
        logger.info("SCRAPE COMPLETE")
        logger.info(f"  Categories: {stats['categories_scraped']}")
        logger.info(f"  Products scraped: {stats['products_scraped']}")
        logger.info(f"  Products enriched: {stats['products_enriched']}")
        logger.info(f"  Products stored: {stats['products_stored']}")
        logger.info(f"  Errors: {len(stats['errors'])}")
        logger.info("=" * 60)
        
        return stats
    
    def _process_batch(self, products: List[Dict], stats: Dict):
        """Enrich and store a batch of products."""
        logger.info(f"Processing batch of {len(products)} products...")
        
        # Enrich with UPC/brand via GraphQL
        enriched = self.enrich_products_batch(products, filter_store=True)
        stats['products_enriched'] += len(enriched)
        
        # Store to Supabase
        for product in enriched:
            # Apply category mapping
            parent = product.pop('_parent_category', None)
            subcat = product.pop('_subcategory', None)
            
            from core.category_mapping import normalize_category
            goods_cat, goods_subcat = normalize_category('central_market', subcat, parent)
            
            # Map fields to BaseScraper expected format
            supabase_product = {
                'product_id': product.get('external_id'),
                'name': product.get('name'),
                'brand': product.get('brand'),
                'upc': product.get('barcode'),  # Map barcode -> upc
                'image_url': product.get('image_url'),
                'cost_price': product.get('cost_price'),
                'list_price': product.get('list_price'),
                'price_per_unit': product.get('price_per_unit'),
                'price_per_unit_uom': product.get('price_per_unit_uom'),
                'category_name': subcat,
                'parent_category': parent,
                'goods_category': goods_cat,
                'goods_subcategory': goods_subcat,
                'is_available': product.get('is_available', True),
                'store_id': self.store_id,
                'raw_data': product,  # Store full product for reference
            }
            
            if self.store_product_in_supabase(supabase_product):
                stats['products_stored'] += 1


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Central Market Product Scraper')
    
    # Modes
    parser.add_argument('--full-scrape', action='store_true', help='Scrape ALL products from ALL categories')
    parser.add_argument('--query', '-q', type=str, help='Search query')
    parser.add_argument('--category', '-c', type=str, help='Category ID')
    
    # Options
    parser.add_argument('--store', '-s', type=str, default='61', help='Store ID (default: 61 - Austin North Lamar)')
    parser.add_argument('--output', '-o', type=str, help='Output JSON file')
    parser.add_argument('--delay', type=float, default=2.0, help='Delay between requests')
    parser.add_argument('--enrich', action='store_true', default=True, help='Enrich with UPC/brand via GraphQL')
    parser.add_argument('--no-filter', action='store_true', help='Include products not available at store')
    parser.add_argument('--cookies', type=str, help='Cookie string for authentication')
    parser.add_argument('--dry-run', action='store_true', help='Skip Supabase storage')
    
    # Info modes
    parser.add_argument('--list-categories', action='store_true', help='List ALL leaf categories')
    parser.add_argument('--list-stores', action='store_true', help='List stores and exit')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # List stores
    if args.list_stores:
        print("\nCentral Market Stores:")
        print("=" * 60)
        for store_id, name in CentralMarketScraper.STORES.items():
            default = " (default)" if store_id == "61" else ""
            print(f"  {store_id}: {name}{default}")
        return
    
    scraper = CentralMarketScraper(
        store_id=args.store,
        delay=args.delay,
        cookies=args.cookies,
        dry_run=args.dry_run
    )
    
    # Show store info
    store_name = scraper.STORES.get(args.store, "Unknown")
    print(f"\n📍 Store: {store_name} (ID: {args.store})")
    
    # List categories
    if args.list_categories:
        print("\nDiscovering ALL Central Market categories...")
        categories = scraper.discover_categories(include_all=True)
        print(f"\n{len(categories)} Leaf Categories:")
        print("=" * 60)
        current_parent = None
        for cat in categories:
            parent = cat.get('parent', 'Unknown')
            if parent != current_parent:
                print(f"\n{parent}:")
                current_parent = parent
            print(f"  • {cat['name']} (ID: {cat['id']})")
        return
    
    # Full scrape mode
    if args.full_scrape:
        print("\n🚀 Starting FULL Central Market Scrape")
        print("=" * 60)
        stats = scraper.run_full_scrape(batch_size=100)
        
        # Save stats
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(stats, f, indent=2)
            print(f"\nStats saved to {args.output}")
        return
    
    # Search/category mode
    results = []
    if args.query or args.category:
        # Get search results (includes pricing)
        raw = scraper.search_all_pages(query=args.query or "", category_id=args.category)
        results = [scraper.extract_product_data(p) for p in raw]
        
        # Enrich with UPC and brand via GraphQL
        if args.enrich:
            results = scraper.enrich_products_batch(
                results, 
                filter_store=not args.no_filter
            )
    else:
        parser.print_help()
        return
    
    # Output
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Saved {len(results)} products to {args.output}")
    else:
        print(f"\n✅ Scraped {len(results)} products")
        if results:
            print("\nFirst 5 products:")
            for p in results[:5]:
                upc = p.get('barcode', 'N/A')
                brand = p.get('brand', 'N/A')
                price = p.get('cost_price', 0)
                name = p.get('name', '')[:40]
                print(f"  • {name}... | ${price} | {brand} | UPC: {upc}")


if __name__ == '__main__':
    main()
