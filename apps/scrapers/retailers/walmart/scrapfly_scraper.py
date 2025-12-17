#!/usr/bin/env python3
"""
Walmart Scraper using ScrapFly API

ScrapFly handles all bot detection (PerimeterX, Akamai) automatically with their
Anti Scraping Protection (ASP) feature.

Based on: https://github.com/scrapfly/scrapfly-scrapers/tree/main/walmart-scraper
Docs: https://scrapfly.io/docs/scrape-api/getting-started

Usage:
    export SCRAPFLY_KEY="your-api-key"
    python walmart_scrapfly_scraper.py --query "cheese" --max-pages 2
    python walmart_scrapfly_scraper.py --query "milk" --output results.json
"""

import argparse
import json
import logging
import math
import os
import time
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class WalmartScrapflyScraper:
    """
    Walmart scraper using ScrapFly API for reliable bot detection bypass.
    
    ScrapFly's ASP (Anti Scraping Protection) handles:
    - PerimeterX
    - Akamai Bot Manager
    - Rate limiting
    - Proxy rotation
    """
    
    SCRAPFLY_API = "https://api.scrapfly.io/scrape"
    
    # Base config for Walmart scraping
    BASE_CONFIG = {
        "asp": "true",           # Anti Scraping Protection - CRITICAL for Walmart
        "country": "US",         # US proxies
        "proxy_pool": "public_residential_pool",  # Residential proxies work best
    }
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the ScrapFly-powered scraper.
        
        Args:
            api_key: ScrapFly API key. If not provided, reads from SCRAPFLY_KEY env var.
        """
        self.api_key = api_key or os.getenv("SCRAPFLY_KEY")
        if not self.api_key:
            raise ValueError(
                "ScrapFly API key required. Set SCRAPFLY_KEY env var or pass api_key parameter.\n"
                "Get your key at: https://scrapfly.io/dashboard"
            )
        
        self.session = requests.Session()
        logger.info("Initialized ScrapFly Walmart scraper")
    
    def _scrape(
        self,
        url: str,
        render_js: bool = False,
        retry: bool = True,
        timeout: int = 60000
    ) -> Optional[str]:
        """
        Make a ScrapFly API request.
        
        Args:
            url: Target URL to scrape
            render_js: Whether to render JavaScript (costs more credits)
            retry: Whether to retry on failure
            timeout: Request timeout in milliseconds
            
        Returns:
            HTML content or None on failure
        """
        params = {
            **self.BASE_CONFIG,
            "key": self.api_key,
            "url": url,
        }
        
        # Note: timeout is not customizable when retry is enabled
        if not retry:
            params["retry"] = "false"
            params["timeout"] = str(timeout)
        
        if render_js:
            params["render_js"] = "true"
            params["rendering_wait"] = "2000"  # Wait 2s for JS to load
        
        try:
            logger.debug(f"ScrapFly request: {url}")
            response = self.session.get(
                self.SCRAPFLY_API,
                params=params,
                timeout=180  # 3 min timeout for ScrapFly
            )
            
            # Check for ScrapFly errors
            if response.status_code != 200:
                error_code = response.headers.get("X-Scrapfly-Reject-Code", "Unknown")
                error_desc = response.headers.get("X-Scrapfly-Reject-Description", "")
                logger.error(f"ScrapFly error {response.status_code}: {error_code} - {error_desc}")
                return None
            
            # Parse ScrapFly response
            data = response.json()
            
            # Check if scrape was successful
            result = data.get("result", {})
            if not result.get("success", False):
                error = result.get("error", {})
                logger.error(f"Scrape failed: {error.get('message', 'Unknown error')}")
                return None
            
            # Log cost for monitoring
            cost = response.headers.get("X-Scrapfly-Api-Cost", "?")
            remaining = response.headers.get("X-Scrapfly-Remaining-Api-Credit", "?")
            logger.info(f"ScrapFly cost: {cost} credits (remaining: {remaining})")
            
            return result.get("content", "")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ScrapFly response: {e}")
            return None
    
    def _extract_next_data(self, html: str) -> Optional[Dict]:
        """Extract __NEXT_DATA__ JSON from HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        script = soup.find('script', {'id': '__NEXT_DATA__'})
        
        if not script:
            logger.warning("__NEXT_DATA__ not found in page")
            return None
        
        try:
            return json.loads(script.string)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse __NEXT_DATA__: {e}")
            return None
    
    def _make_search_url(self, query: str = "", page: int = 1, sort: str = "best_match") -> str:
        """Build Walmart search URL."""
        params = {
            "q": query,
            "page": page,
            "sort": sort,
            "affinityOverride": "default"
        }
        return "https://www.walmart.com/search?" + urlencode(params)
    
    def _make_browse_url(self, category_id: str, page: int = 1) -> str:
        """Build Walmart category browse URL."""
        params = {
            "cat_id": category_id,
            "page": page,
            "affinityOverride": "default"
        }
        return "https://www.walmart.com/search?" + urlencode(params)
    
    def parse_search_results(self, data: Dict) -> Dict[str, Any]:
        """Parse search results from __NEXT_DATA__."""
        try:
            search_result = data["props"]["pageProps"]["initialData"]["searchResult"]
            item_stacks = search_result.get("itemStacks", [])
            
            results = []
            total_results = 0
            
            for stack in item_stacks:
                items = stack.get("items", [])
                results.extend(items)
                count = stack.get("count", 0)
                if count > total_results:
                    total_results = count
            
            return {
                "results": results,
                "total_results": total_results
            }
        except KeyError as e:
            logger.error(f"Failed to parse search results: {e}")
            return {"results": [], "total_results": 0}
    
    def parse_product_page(self, data: Dict) -> Optional[Dict[str, Any]]:
        """Parse product data from __NEXT_DATA__."""
        try:
            product_raw = data["props"]["pageProps"]["initialData"]["data"]["product"]
            reviews_raw = data["props"]["pageProps"]["initialData"]["data"].get("reviews")
            
            # Filter to essential keys
            wanted_keys = [
                "availabilityStatus", "averageRating", "brand", "id",
                "imageInfo", "manufacturerName", "name", "orderLimit",
                "orderMinLimit", "priceInfo", "shortDescription", "type",
                "upc", "gtin13"  # UPC codes when available
            ]
            product = {k: v for k, v in product_raw.items() if k in wanted_keys}
            
            return {
                "product": product,
                "reviews": reviews_raw
            }
        except KeyError as e:
            logger.error(f"Failed to parse product: {e}")
            return None
    
    def scrape_search(
        self,
        query: str = "",
        category_id: Optional[str] = None,
        max_pages: Optional[int] = None,
        sort: str = "best_match",
        delay: float = 1.0,
        use_js_rendering: bool = False
    ) -> List[Dict]:
        """
        Scrape Walmart search results.
        
        Args:
            query: Search query (empty for category browsing)
            category_id: Category ID for browsing (e.g., "976759_976794_7433209")
            max_pages: Maximum pages to scrape
            sort: Sort order ('best_match', 'price_low', 'price_high')
            delay: Delay between pages in seconds
            use_js_rendering: Whether to use JS rendering (costs more but more reliable)
            
        Returns:
            List of product dictionaries
        """
        all_results = []
        
        # Build first page URL
        if category_id:
            url = self._make_browse_url(category_id, page=1)
            logger.info(f"Scraping category: {category_id}")
        else:
            url = self._make_search_url(query, page=1, sort=sort)
            logger.info(f"Scraping search: '{query}'")
        
        # Scrape first page (use JS rendering for reliability)
        logger.info(f"Fetching page 1...")
        html = self._scrape(url, render_js=use_js_rendering)
        
        if not html:
            logger.error("Failed to fetch first page")
            return all_results
        
        # Extract __NEXT_DATA__
        data = self._extract_next_data(html)
        if not data:
            logger.error("Failed to extract __NEXT_DATA__")
            # Try with JS rendering as fallback
            if not use_js_rendering:
                logger.info("Retrying with JS rendering...")
                html = self._scrape(url, render_js=True)
                if html:
                    data = self._extract_next_data(html)
        
        if not data:
            return all_results
        
        # Parse results
        parsed = self.parse_search_results(data)
        all_results.extend(parsed["results"])
        total_results = parsed["total_results"]
        
        logger.info(f"Page 1: Found {len(parsed['results'])} items (total: {total_results})")
        
        # Calculate total pages
        items_per_page = 40
        total_pages = math.ceil(total_results / items_per_page)
        
        # Walmart caps at 25 pages
        if total_pages > 25:
            total_pages = 25
        
        if max_pages and max_pages < total_pages:
            total_pages = max_pages
        
        # Scrape remaining pages (can skip JS rendering after first page)
        for page in range(2, total_pages + 1):
            time.sleep(delay)
            
            if category_id:
                url = self._make_browse_url(category_id, page=page)
            else:
                url = self._make_search_url(query, page=page, sort=sort)
            
            logger.info(f"Fetching page {page}/{total_pages}...")
            html = self._scrape(url, render_js=False)  # Usually don't need JS for subsequent pages
            
            if not html:
                logger.warning(f"Failed to fetch page {page}")
                continue
            
            data = self._extract_next_data(html)
            if not data:
                logger.warning(f"Failed to extract __NEXT_DATA__ from page {page}")
                continue
            
            parsed = self.parse_search_results(data)
            all_results.extend(parsed["results"])
            logger.info(f"Page {page}: Found {len(parsed['results'])} items")
        
        logger.info(f"Total scraped: {len(all_results)} products")
        return all_results
    
    def scrape_product(self, url: str, use_js_rendering: bool = True) -> Optional[Dict]:
        """
        Scrape a single product page.
        
        Args:
            url: Product page URL (e.g., https://www.walmart.com/ip/product-name/12345)
            use_js_rendering: Use JS rendering for reliability
            
        Returns:
            Product dictionary or None
        """
        logger.info(f"Scraping product: {url}")
        html = self._scrape(url, render_js=use_js_rendering)
        
        if not html:
            return None
        
        data = self._extract_next_data(html)
        if not data:
            # Retry with JS if not already using
            if not use_js_rendering:
                logger.info("Retrying with JS rendering...")
                html = self._scrape(url, render_js=True)
                if html:
                    data = self._extract_next_data(html)
        
        if not data:
            return None
        
        return self.parse_product_page(data)
    
    def enrich_with_pdp(self, product: Dict, delay: float = 1.0) -> Dict:
        """
        Enrich a search result product with PDP data (UPC, brand).
        
        OPTIMIZED: Uses NO JS rendering (25 credits vs 30 credits per product)
        
        This costs additional credits (~25 per product) but provides:
        - barcode (UPC)
        - brand (when missing from search)
        
        Args:
            product: Normalized product from search results
            delay: Delay before request
            
        Returns:
            Product with UPC and brand populated
        """
        import time
        
        url = product.get("url")
        if not url:
            return product
        
        time.sleep(delay)
        
        # OPTIMIZATION: Skip JS rendering - saves 5 credits per PDP (25 vs 30)
        pdp_data = self.scrape_product(url, use_js_rendering=False)
        if pdp_data and pdp_data.get("product"):
            pdp_product = pdp_data["product"]
            
            # Add UPC (barcode)
            if pdp_product.get("upc"):
                product["barcode"] = pdp_product["upc"]
                logger.info(f"  Found UPC: {product['barcode']}")
            
            # Add brand if missing
            if not product.get("brand") and pdp_product.get("brand"):
                product["brand"] = pdp_product["brand"]
                logger.info(f"  Found brand: {product['brand']}")
            
            # Add any other PDP-only fields
            if pdp_product.get("gtin13"):
                product["gtin13"] = pdp_product["gtin13"]
        
        return product
    
    def scrape_search_with_upc(
        self,
        query: str = "",
        category_id: Optional[str] = None,
        max_pages: Optional[int] = None,
        max_pdp: Optional[int] = None,
        sort: str = "best_match",
        delay: float = 1.0,
    ) -> List[Dict]:
        """
        Scrape search results AND fetch UPC from PDP for each product.
        
        WARNING: This is credit-intensive! ~30 credits per product for PDP.
        
        Args:
            query: Search query
            category_id: Category ID
            max_pages: Max search pages
            max_pdp: Max products to fetch PDP for (None = all)
            sort: Sort order
            delay: Delay between requests
            
        Returns:
            List of products with UPC barcodes
        """
        # First, get search results
        products = self.scrape_search(
            query=query,
            category_id=category_id,
            max_pages=max_pages,
            sort=sort,
            delay=delay,
            use_js_rendering=False  # Save credits on search
        )
        
        # Normalize products
        normalized = [self.extract_normalized_product(p) for p in products]
        
        # Enrich with PDP data
        pdp_count = 0
        for product in normalized:
            if max_pdp and pdp_count >= max_pdp:
                logger.info(f"Reached max PDP limit ({max_pdp})")
                break
            
            logger.info(f"Fetching PDP for: {product['name'][:40]}...")
            self.enrich_with_pdp(product, delay=delay)
            pdp_count += 1
        
        return normalized
    
    def extract_normalized_product(self, item: Dict) -> Dict[str, Any]:
        """
        Extract normalized product data from a search result item.
        
        Maps Walmart API fields to Goods schema per RETAILER_SCRAPING_GUIDE.md:
        
        | API Field | Goods Schema Field | Notes |
        |-----------|-------------------|-------|
        | usItemId | external_id | Walmart item ID |
        | upc | barcode | 12-digit UPC (PDP only) |
        | name | name | Product name |
        | brand | brand | Brand name |
        | priceInfo.currentPrice.price | cost_price | Current price |
        | priceInfo.wasPrice.price | list_price | Original price |
        | priceInfo.unitPrice.priceString | price_per_unit | e.g., "$1.47/lb" |
        | priceInfo.priceDisplayCodes.pricePerUnitUom | price_per_unit_uom | Unit of measure |
        | productLocation[].displayValue | store_location | Aisle display (e.g., "A12") |
        | productLocation[].aisle.zone | store_zone | Zone letter (e.g., "A") |
        | productLocation[].aisle.aisle | store_aisle | Aisle number (e.g., 12) |
        | imageInfo.thumbnailUrl | image_url | Product image |
        | averageRating | rating | Customer rating |
        | numberOfReviews | review_count | Number of reviews |
        | snapEligible | snap_eligible | SNAP/EBT eligible |
        """
        import re
        
        price_info = item.get("priceInfo", {})
        image_info = item.get("imageInfo", {})
        
        # Extract current price (cost_price)
        # Try multiple sources: direct price field, linePrice, currentPrice
        cost_price = item.get("price")  # Direct price field (numeric)
        if cost_price is None:
            # Parse from linePrice string (e.g., "$2.97")
            line_price = price_info.get("linePrice", "")
            if line_price:
                match = re.search(r'\$?([\d.]+)', line_price)
                if match:
                    cost_price = float(match.group(1))
        
        # Extract list price (original/was price)
        list_price = None
        was_price = price_info.get("wasPrice", "")
        if was_price:
            match = re.search(r'\$?([\d.]+)', was_price)
            if match:
                list_price = float(match.group(1))
        
        # Extract unit price and UOM (e.g., "18.6 ¢/oz" or "$1.47/lb")
        unit_price_str = price_info.get("unitPrice", "")
        price_per_unit = None
        price_per_unit_uom = None
        
        if unit_price_str:
            # Parse formats like "18.6 ¢/oz", "$1.47/lb", "29.3 ¢/oz"
            match = re.match(r'[\$]?([\d.]+)\s*[¢]?/(\w+)', unit_price_str)
            if match:
                price_per_unit = float(match.group(1))
                price_per_unit_uom = match.group(2)
                # Convert cents to dollars if needed
                if '¢' in unit_price_str:
                    price_per_unit = price_per_unit / 100
        
        # Extract product location (aisle info)
        location_list = item.get("productLocation", [])
        store_location = None
        store_zone = None
        store_aisle = None
        
        if location_list and len(location_list) > 0:
            location = location_list[0]
            store_location = location.get("displayValue")  # e.g., "B3"
            aisle_info = location.get("aisle", {})
            if aisle_info:
                store_zone = aisle_info.get("zone")  # e.g., "B"
                store_aisle = aisle_info.get("aisle")  # e.g., 3
        
        # Fallback to displayValue if structured location not available
        if not store_location:
            store_location = item.get("productLocationDisplayValue")
        
        return {
            # Goods Schema Fields (per RETAILER_SCRAPING_GUIDE.md)
            "external_id": item.get("usItemId", ""),
            "barcode": item.get("upc"),  # Only available in PDP
            "name": item.get("name", ""),
            "brand": item.get("brand"),
            "cost_price": cost_price,
            "list_price": list_price,
            "price_per_unit": price_per_unit,
            "price_per_unit_uom": price_per_unit_uom,
            "image_url": item.get("image") or image_info.get("thumbnailUrl", ""),
            "store_location": store_location,
            "store_zone": store_zone,
            "store_aisle": store_aisle,
            "rating": item.get("averageRating"),
            "review_count": item.get("numberOfReviews"),
            "snap_eligible": item.get("snapEligible", False),
            
            # Additional useful fields
            "url": "https://www.walmart.com" + item.get("canonicalUrl", ""),
            "in_stock": not item.get("isOutOfStock", True),
            "availability_status": item.get("availabilityStatusDisplayValue"),
            "category": item.get("catalogProductType"),
            "seller_id": item.get("sellerId"),
            "seller_name": item.get("sellerName"),
            
            # Raw price info for debugging
            "_raw_price_info": price_info,
        }


def main():
    parser = argparse.ArgumentParser(
        description='Scrape Walmart using ScrapFly API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Set your API key first
    export SCRAPFLY_KEY="your-api-key-here"
    
    # Search for products
    python walmart_scrapfly_scraper.py --query "cheese" --max-pages 2
    
    # Browse a category
    python walmart_scrapfly_scraper.py --category "976759_976794_7433209" --max-pages 3
    
    # Save results to file
    python walmart_scrapfly_scraper.py --query "milk" --output results.json
    
    # Scrape a single product
    python walmart_scrapfly_scraper.py --product-url "https://www.walmart.com/ip/xxx/12345"
        """
    )
    
    parser.add_argument('--query', '-q', help='Search query')
    parser.add_argument('--category', '-c', help='Category ID to browse')
    parser.add_argument('--product-url', help='Single product URL to scrape')
    parser.add_argument('--max-pages', type=int, default=2, help='Max pages to scrape (default: 2)')
    parser.add_argument('--delay', type=float, default=1.0, help='Delay between pages (default: 1.0s)')
    parser.add_argument('--output', '-o', help='Output JSON file')
    parser.add_argument('--api-key', help='ScrapFly API key (or set SCRAPFLY_KEY env var)')
    parser.add_argument('--js-rendering', action='store_true', help='Use JS rendering (more reliable but costs more)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--fetch-upc', action='store_true', 
                        help='Fetch UPC/barcode from PDP (costs ~30 credits per product)')
    parser.add_argument('--max-pdp', type=int, 
                        help='Max products to fetch PDP for (use with --fetch-upc)')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        scraper = WalmartScrapflyScraper(api_key=args.api_key)
    except ValueError as e:
        print(f"Error: {e}")
        return
    
    results = []
    
    if args.product_url:
        # Scrape single product
        result = scraper.scrape_product(args.product_url, use_js_rendering=args.js_rendering)
        if result:
            results = [result]
    elif args.query or args.category:
        if args.fetch_upc:
            # Scrape with UPC fetching (expensive!)
            logger.warning("⚠️  Fetching UPC costs ~30 credits per product!")
            results = scraper.scrape_search_with_upc(
                query=args.query or "",
                category_id=args.category,
                max_pages=args.max_pages,
                max_pdp=args.max_pdp,
                delay=args.delay,
            )
        else:
            # Scrape search/category only (cheaper)
            raw_results = scraper.scrape_search(
                query=args.query or "",
                category_id=args.category,
                max_pages=args.max_pages,
                delay=args.delay,
                use_js_rendering=args.js_rendering
            )
            
            # Normalize results
            results = [scraper.extract_normalized_product(item) for item in raw_results]
    else:
        parser.print_help()
        print("\nError: Please provide --query, --category, or --product-url")
        return
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Saved {len(results)} products to {args.output}")
    else:
        # Print summary
        print(f"\n{'='*60}")
        print("SCRAPE RESULTS")
        print(f"{'='*60}")
        print(f"Query: {args.query or 'N/A'}")
        print(f"Category: {args.category or 'N/A'}")
        print(f"Products found: {len(results)}")
        
        if results and not args.product_url:
            print(f"\nFirst 5 products:")
            for i, item in enumerate(results[:5]):
                name = item.get('name', 'Unknown')[:50]
                price = item.get('price', 'N/A')
                print(f"  {i+1}. {name}... - ${price}")
        elif results and args.product_url:
            print(f"\nProduct: {results[0].get('product', {}).get('name', 'Unknown')}")
        
        print(f"{'='*60}")


if __name__ == '__main__':
    main()

