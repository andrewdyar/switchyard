#!/usr/bin/env python3
"""
Dollar Tree scraper - Online products only.

This scraper:
- Uses Playwright browser automation to bypass bot detection
- Scrapes all Dollar Tree products available online
- Extracts UPC/barcode for arbitrage matching
- Saves to JSON file (not Supabase - for arbitrage purposes only)

Usage:
    python3 scrapers/dollar_tree_scraper.py
    python3 scrapers/dollar_tree_scraper.py --output dt_products.json
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode, unquote

try:
    from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeout
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    logger = logging.getLogger(__name__)
    if logger:
        logger.error("Playwright not installed. Install with: pip install playwright && playwright install chromium")

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, f'dollar_tree_scrape_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

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


class DollarTreeScraper:
    """Scraper for Dollar Tree online products using Playwright."""
    
    BASE_URL = "https://www.dollartree.com/ccstoreui/v1/search"
    CATEGORY_URL = "https://www.dollartree.com/category"
    
    # Base search parameters (from provided request - exact match)
    # This filter ensures: online only (callCenterOnly:N), active products, DollarProductType or EnsembleProductType
    BASE_PARAMS = {
        'N': '78784723+3207083037',
        'Nrpp': '48',  # Records per page
        'No': '0',  # Offset (will be updated during pagination)
        'Ns': '',  # Sort parameter (empty = default)
        'Nr': 'AND(AND(OR(NOT(record.type:DollarProductType),AND(DollarProductType.dtdIndicator:Y,DollarProductType.showOnWeb:Y,DollarProductType.callCenterOnly:N)),NOT(product.repositoryId:handlingProd1)),product.active:1,OR(record.type:DollarProductType,record.type:EnsembleProductType))',
    }
    
    def __init__(self, delay: float = 1.5, delay_variance: float = 0.3, headless: bool = True):
        """
        Initialize the Dollar Tree scraper.
        
        Args:
            delay: Base delay between requests (seconds)
            delay_variance: Random variance in delay (seconds)
            headless: Run browser in headless mode
        """
        if not HAS_PLAYWRIGHT:
            raise ImportError("Playwright is required. Install with: pip install playwright && playwright install chromium")
        
        self.delay = delay
        self.delay_variance = delay_variance
        self.headless = headless
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.session_established = False
        
        logger.info("Initialized Dollar Tree scraper (Playwright-based)")
    
    def _rate_limit(self):
        """Apply rate limiting with variance."""
        import random
        wait_time = self.delay + random.uniform(0, self.delay_variance)
        time.sleep(wait_time)
    
    def start_browser(self):
        """Start the Playwright browser."""
        if self.browser is not None:
            return
        
        logger.info("Starting Playwright browser...")
        self.playwright = sync_playwright().start()
        
        # Launch with stealth settings
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )
        
        # Create context with realistic settings
        self.context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/Chicago',
        )
        
        # Stealth scripts to avoid detection
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        """)
        
        self.page = self.context.new_page()
        logger.info("✅ Browser started")
    
    def stop_browser(self):
        """Stop the browser."""
        if self.page:
            self.page.close()
            self.page = None
        if self.browser:
            self.browser.close()
            self.browser = None
        if self.playwright:
            self.playwright.stop()
            self.playwright = None
        logger.info("Browser stopped")
    
    def establish_session(self) -> bool:
        """Visit category page to establish session and cookies."""
        if not self.page:
            self.start_browser()
        
        try:
            logger.info("Establishing session by visiting category page...")
            self.page.goto(self.CATEGORY_URL, wait_until='domcontentloaded', timeout=60000)
            time.sleep(5)  # Wait for page to fully load and establish session
            
            # Check if we got cookies
            cookies = self.context.cookies()
            if cookies:
                logger.info(f"✅ Session established with {len(cookies)} cookies")
                self.session_established = True
                return True
            else:
                logger.warning("⚠️ No cookies received - session may not be established")
                return False
        except Exception as e:
            logger.error(f"❌ Session establishment failed: {e}")
            return False
    
    def fetch_search_page(self, offset: int = 0, records_per_page: int = 48) -> Optional[Dict[str, Any]]:
        """
        Fetch a page of search results using browser automation.
        
        Args:
            offset: Pagination offset (No parameter)
            records_per_page: Number of records per page (Nrpp parameter)
            
        Returns:
            API response dict or None on error
        """
        if not self.page:
            if not self.establish_session():
                return None
        
        # Build search URL with parameters
        # Note: The 'N' parameter contains '+' which must remain as literal '+' in the URL
        # urlencode converts '+' to '%2B', but the API expects literal '+'
        params = self.BASE_PARAMS.copy()
        params['No'] = str(offset)
        params['Nrpp'] = str(records_per_page)
        if 'Ns' not in params:
            params['Ns'] = ''
        
        # Manually construct query string to preserve '+' in N parameter
        from urllib.parse import quote
        n_value = params.pop('N')  # Extract N to preserve the '+'
        query_parts = [f"N={n_value}"]  # Keep N with literal +
        # Encode other parameters normally
        for k, v in params.items():
            if v:  # Skip empty values
                query_parts.append(f"{k}={quote(str(v), safe='')}")
        search_url = f"{self.BASE_URL}?{'&'.join(query_parts)}"
        
        try:
            self._rate_limit()
            
            # Navigate to category page first (to maintain session context)
            logger.debug(f"Navigating to category page to maintain session...")
            self.page.goto(self.CATEGORY_URL, wait_until='domcontentloaded', timeout=30000)
            time.sleep(2)  # Wait for page to initialize
            
            # Now make the API call using Playwright's request context (maintains cookies)
            logger.info(f"Fetching search results at offset {offset}...")
            
            api_response = None
            try:
                # Make request using Playwright's request context (maintains cookies)
                response = self.page.request.get(
                    search_url,
                    headers={
                        'accept': 'application/json, text/javascript, */*; q=0.01',
                        'accept-language': 'en-US,en;q=0.6',
                        'cache-control': 'no-cache',
                        'pragma': 'no-cache',
                        'referer': 'https://www.dollartree.com/category',
                        'x-cc-meteringmode': 'CC-NonMetered',
                        'x-ccpricelistgroup': 'defaultPriceGroup',
                        'x-ccprofiletype': 'storefrontUI',
                        'x-ccsite': 'siteUS',
                        'x-ccviewport': 'lg',
                        'x-requested-with': 'XMLHttpRequest',
                    }
                )
                
                if response.ok:
                    api_response = response.json()
                    # Check for error in response
                    if api_response and 'resultsList' in api_response:
                        results_list = api_response['resultsList']
                        if '@error' in results_list:
                            logger.warning(f"API returned error: {results_list.get('@error')}")
                            # Try to continue anyway - sometimes error is present but data is too
                else:
                    logger.warning(f"API returned status {response.status}: {response.text[:200]}")
            except Exception as e:
                logger.error(f"Error making API request: {e}", exc_info=True)
            
            if api_response:
                results_list = api_response.get('resultsList', {})
                records = results_list.get('records', [])
                if records:
                    logger.info(f"  ✅ Got {len(records)} records at offset {offset}")
                else:
                    logger.warning(f"  ⚠️ No records in response at offset {offset}")
                    # Debug: log response structure
                    logger.debug(f"Response keys: {list(api_response.keys())}")
                    logger.debug(f"resultsList keys: {list(results_list.keys())}")
                return api_response
            else:
                logger.warning(f"  ⚠️ No response data at offset {offset}")
                return None
                
        except PlaywrightTimeout:
            logger.error(f"Timeout fetching offset {offset}")
            return None
        except Exception as e:
            logger.error(f"Error fetching offset {offset}: {e}", exc_info=True)
            return None
    
    def extract_product(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract product data from a record.
        
        Maps to unified Goods schema fields per retailer-scraping-guide.md:
        - external_id: product.id
        - barcode: DollarProductType.UPCs (UPC)
        - name: product.displayName
        - brand: (if available)
        - cost_price: sku.activePrice
        - list_price: product.listPrice
        - price_per_unit: product.x_unitprice
        - price_per_unit_uom: (extracted from unit price string if available)
        - size: (from dimensions or description)
        - image_url: product.primaryFullImageURL
        - rating: DollarProductType.averageRating
        - review_count: DollarProductType.numberOfReviews
        
        Args:
            record: Product record from API response
            
        Returns:
            Normalized product dict matching unified schema or None
        """
        try:
            attributes = record.get('attributes', {})
            
            # external_id (product.id) - required
            product_id = self._get_first(attributes.get('product.id', []))
            if not product_id:
                return None
            
            # barcode (UPC) - critical for arbitrage matching
            upcs = attributes.get('DollarProductType.UPCs', [])
            barcode = self._get_first(upcs)
            # Clean UPC - remove leading zeros if needed for standardization
            if barcode:
                barcode = barcode.lstrip('0') or barcode  # Keep at least one digit
            
            # name (product.displayName)
            display_name = self._get_first(attributes.get('product.displayName', []))
            description = self._get_first(attributes.get('product.description', []))
            name = display_name or description
            if not name:
                return None
            
            # brand (if available - Dollar Tree may not have brand field)
            brand = self._get_first(attributes.get('product.brand', [])) or \
                   self._get_first(attributes.get('brand.name', []))
            
            # cost_price (sku.activePrice)
            price_str = self._get_first(attributes.get('sku.activePrice', []))
            cost_price = float(price_str) if price_str else None
            
            # list_price (product.listPrice)
            list_price_str = self._get_first(attributes.get('product.listPrice', []))
            list_price = float(list_price_str) if list_price_str else None
            
            # price_per_unit (product.x_unitprice)
            unit_price_str = self._get_first(attributes.get('product.x_unitprice', []))
            price_per_unit = None
            price_per_unit_uom = None
            if unit_price_str:
                # Try to parse unit price (e.g., "$1.50" or "1.50")
                try:
                    price_per_unit = float(unit_price_str.replace('$', '').strip())
                except (ValueError, AttributeError):
                    pass
            
            # size (from dimensions or description)
            size = None
            weight = self._get_first(attributes.get('product.weightDimension', []))
            if weight:
                size = weight
            
            # image_url (product.primaryFullImageURL)
            primary_image = self._get_first(attributes.get('product.primaryFullImageURL', []))
            if primary_image:
                if not primary_image.startswith('http'):
                    image_url = f"https://www.dollartree.com{primary_image}"
                else:
                    image_url = primary_image
            else:
                image_url = None
            
            # rating (DollarProductType.averageRating)
            rating_str = self._get_first(attributes.get('DollarProductType.averageRating', []))
            rating = float(rating_str) if rating_str else None
            
            # review_count (DollarProductType.numberOfReviews)
            review_count_str = self._get_first(attributes.get('DollarProductType.numberOfReviews', []))
            review_count = int(review_count_str) if review_count_str else None
            
            # Additional fields for reference
            category = self._get_first(attributes.get('product.category', []))
            parent_categories = attributes.get('parentCategory.displayName', [])
            route = self._get_first(attributes.get('product.route', []))
            product_url = f"https://www.dollartree.com{route}" if route else None
            
            # Return normalized product matching unified schema
            return {
                # Unified schema fields (per retailer-scraping-guide.md)
                'external_id': product_id,
                'barcode': barcode,  # Critical for arbitrage matching
                'name': name,
                'brand': brand,
                'cost_price': cost_price,
                'list_price': list_price,
                'price_per_unit': price_per_unit,
                'price_per_unit_uom': price_per_unit_uom,
                'size': size,
                'image_url': image_url,
                'rating': rating,
                'review_count': review_count,
                
                # Additional Dollar Tree specific fields
                'category': category,
                'parent_categories': parent_categories,
                'product_url': product_url,
                'description': description,
                'long_description': self._get_first(attributes.get('product.longDescription', [])),
                'availability': self._get_first(attributes.get('sku.availabilityStatus', [])),
                'raw_data': record,  # Keep full record for reference
            }
        except Exception as e:
            logger.error(f"Error extracting product: {e}", exc_info=True)
            return None
    
    def _get_first(self, value_list: List) -> Optional[Any]:
        """Get first value from list, or None if empty."""
        return value_list[0] if value_list else None
    
    def scrape_all(self) -> List[Dict[str, Any]]:
        """
        Scrape all Dollar Tree online products.
        
        Returns:
            List of normalized product dictionaries
        """
        all_products = []
        offset = 0
        records_per_page = 48
        
        logger.info("=" * 70)
        logger.info("DOLLAR TREE SCRAPER - Online Products Only (Browser-based)")
        logger.info("=" * 70)
        
        # Establish session first
        if not self.establish_session():
            logger.error("Failed to establish session - cannot proceed")
            return []
        
        logger.info("Starting scrape of all online products...")
        
        while True:
            logger.info(f"Fetching page at offset {offset}...")
            
            response = self.fetch_search_page(offset=offset, records_per_page=records_per_page)
            if not response:
                logger.warning(f"Failed to fetch offset {offset}, stopping")
                break
            
            results_list = response.get('resultsList', {})
            records = results_list.get('records', [])
            
            if not records:
                logger.warning("No records in response - stopping scrape")
                break
            
            # Extract products from records
            page_products = 0
            for record in records:
                # Records can be nested - check for inner records
                inner_records = record.get('records', [])
                if inner_records:
                    for inner_record in inner_records:
                        product = self.extract_product(inner_record)
                        if product:
                            all_products.append(product)
                            page_products += 1
                else:
                    # Direct record
                    product = self.extract_product(record)
                    if product:
                        all_products.append(product)
                        page_products += 1
            
            if page_products == 0:
                logger.warning("No products extracted from this page - check response structure")
                # Log a sample of the response for debugging
                logger.debug(f"Sample record keys: {list(records[0].keys()) if records else 'No records'}")
            
            logger.info(f"  Extracted {page_products} products from this page (total: {len(all_products)})")
            
            # Check pagination info
            last_rec_num = results_list.get('lastRecNum', 0)
            first_rec_num = results_list.get('firstRecNum', 0)
            total_records = results_list.get('totalNumRecs')  # Note: field is totalNumRecs, not totalRecords
            
            if total_records:
                logger.info(f"  Progress: {last_rec_num}/{total_records} records ({last_rec_num/total_records*100:.1f}%)")
            else:
                logger.info(f"  Records: {first_rec_num}-{last_rec_num}")
            
            # Check if we've reached the end
            # If we got fewer records than requested, we're done
            if page_products < records_per_page:
                logger.info("Got fewer records than requested - reached end")
                break
            
            # If lastRecNum indicates we've seen all records
            if total_records and last_rec_num >= total_records:
                logger.info("Reached total records limit")
                break
            
            # Continue to next page
            offset += records_per_page
        
        logger.info("=" * 70)
        logger.info(f"Scrape complete: {len(all_products)} products")
        logger.info(f"  Products with UPC: {sum(1 for p in all_products if p.get('barcode'))}")
        logger.info("=" * 70)
        
        return all_products
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup browser."""
        self.stop_browser()


def save_to_file(filepath: str, products: List[Dict], stats: Dict):
    """Save products and stats to JSON file."""
    output = {
        'metadata': {
            'retailer': 'dollar_tree',
            'scraped_at': datetime.utcnow().isoformat(),
            'total_products': len(products),
            'products_with_upc': sum(1 for p in products if p.get('barcode')),
            'stats': stats,
        },
        'products': products,
    }
    
    with open(filepath, 'w') as f:
        json.dump(output, f, indent=2, default=str)
    
    logger.info(f"Saved {len(products):,} products to {filepath}")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Dollar Tree Scraper - Online Products Only (for arbitrage)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scrapers/dollar_tree_scraper.py
  python3 scrapers/dollar_tree_scraper.py --output dt_products.json
  python3 scrapers/dollar_tree_scraper.py --delay 2.0 --headless
        """
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='dt_products.json',
        help='Output JSON file path (default: dt_products.json)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=1.5,
        help='Base delay between requests in seconds (default: 1.5)'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=0.3,
        help='Random variance in delay in seconds (default: 0.3)'
    )
    
    parser.add_argument(
        '--headless',
        action='store_true',
        default=True,
        help='Run browser in headless mode (default: True)'
    )
    
    parser.add_argument(
        '--no-headless',
        action='store_false',
        dest='headless',
        help='Run browser with visible window'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable debug logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info("=" * 70)
    logger.info("DOLLAR TREE SCRAPER CONFIGURATION")
    logger.info("=" * 70)
    logger.info(f"Output file: {args.output}")
    logger.info(f"Delay: {args.delay}s ± {args.delay_variance}s")
    logger.info(f"Headless: {args.headless}")
    logger.info(f"Log file: {log_file}")
    logger.info("=" * 70)
    
    # Initialize scraper with context manager
    try:
        with DollarTreeScraper(
            delay=args.delay,
            delay_variance=args.delay_variance,
            headless=args.headless
        ) as scraper:
            # Run scraper
            products = scraper.scrape_all()
            
            # Calculate stats
            stats = {
                'total_products': len(products),
                'products_with_upc': sum(1 for p in products if p.get('barcode')),
                'products_with_price': sum(1 for p in products if p.get('cost_price')),
                'products_with_image': sum(1 for p in products if p.get('image_url')),
                'unique_categories': len(set(p.get('category') for p in products if p.get('category'))),
            }
            
            # Save to file
            save_to_file(args.output, products, stats)
            
            # Print summary
            print("\n" + "=" * 70)
            print("SCRAPE SUMMARY")
            print("=" * 70)
            print(f"Total products: {stats['total_products']:,}")
            print(f"Products with UPC: {stats['products_with_upc']:,}")
            print(f"Products with price: {stats['products_with_price']:,}")
            print(f"Products with image: {stats['products_with_image']:,}")
            print(f"Unique categories: {stats['unique_categories']}")
            print(f"Output file: {args.output}")
            print(f"Log file: {log_file}")
            print("=" * 70)
            
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Scraping interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"\n❌ Fatal error during scraping: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
