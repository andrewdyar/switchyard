#!/usr/bin/env python3
"""
Walmart HTML Scraper - Uses __NEXT_DATA__ extraction technique.

Based on ScrapFly's approach:
https://scrapfly.io/blog/posts/how-to-scrape-walmartcom
https://github.com/scrapfly/scrapfly-scrapers/tree/main/walmart-scraper

Instead of calling GraphQL APIs directly (which trigger aggressive bot detection),
this scraper requests the HTML pages and extracts the embedded __NEXT_DATA__ JSON.

Usage:
    python walmart_html_scraper.py --query "cheese" --max-pages 2
    python walmart_html_scraper.py --cookies-from-curl "curl ..."
"""

import argparse
import json
import logging
import math
import re
import time
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class WalmartHTMLScraper:
    """
    Scraper that extracts product data from Walmart's __NEXT_DATA__ embedded JSON.
    
    This approach is more reliable than direct API calls because:
    1. It mimics normal browser behavior
    2. The data structure is stable (Next.js hydration)
    3. Less aggressive bot detection than API endpoints
    """
    
    DEFAULT_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
    }
    
    def __init__(self, cookies: Optional[Dict[str, str]] = None):
        """
        Initialize the scraper.
        
        Args:
            cookies: Optional dictionary of cookies to use for requests
        """
        self.session = requests.Session()
        self.session.headers.update(self.DEFAULT_HEADERS)
        
        if cookies:
            for name, value in cookies.items():
                self.session.cookies.set(name, value, domain='.walmart.com', path='/')
            logger.info(f"Loaded {len(cookies)} cookies")
    
    @classmethod
    def parse_cookies_from_curl(cls, curl_command: str) -> Dict[str, str]:
        """
        Parse cookies from a cURL command string.
        
        Args:
            curl_command: Full cURL command copied from browser
            
        Returns:
            Dictionary of cookie name -> value
        """
        cookies = {}
        
        # Find -b or --cookie flag
        cookie_match = re.search(r"-b\s+['\"]([^'\"]+)['\"]", curl_command)
        if not cookie_match:
            cookie_match = re.search(r"--cookie\s+['\"]([^'\"]+)['\"]", curl_command)
        
        if cookie_match:
            cookie_string = cookie_match.group(1)
            # Parse cookie string
            for cookie in cookie_string.split(';'):
                cookie = cookie.strip()
                if '=' in cookie:
                    name, value = cookie.split('=', 1)
                    cookies[name.strip()] = value.strip()
        
        return cookies
    
    def _extract_next_data(self, html: str) -> Optional[Dict]:
        """
        Extract __NEXT_DATA__ JSON from HTML.
        
        Args:
            html: HTML content of the page
            
        Returns:
            Parsed JSON data or None if not found
        """
        soup = BeautifulSoup(html, 'html.parser')
        script = soup.find('script', {'id': '__NEXT_DATA__'})
        
        if not script:
            logger.warning("__NEXT_DATA__ script not found")
            return None
        
        try:
            return json.loads(script.string)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse __NEXT_DATA__: {e}")
            return None
    
    def _make_search_url(self, query: str = "", page: int = 1, sort: str = "best_match") -> str:
        """Build search URL."""
        params = {
            "q": query,
            "page": page,
            "sort": sort,
            "affinityOverride": "default"
        }
        return "https://www.walmart.com/search?" + urlencode(params)
    
    def _make_browse_url(self, category_id: str, page: int = 1) -> str:
        """Build category browse URL."""
        # Walmart browse URLs use the format: /browse/{category_name}/{category_id}
        # Or simpler search with cat_id parameter
        params = {
            "cat_id": category_id,
            "page": page,
            "affinityOverride": "default"
        }
        return "https://www.walmart.com/search?" + urlencode(params)
    
    def parse_search_results(self, data: Dict) -> Dict[str, Any]:
        """
        Parse search results from __NEXT_DATA__.
        
        Args:
            data: Parsed __NEXT_DATA__ JSON
            
        Returns:
            Dictionary with 'results' list and 'total_results' count
        """
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
        """
        Parse product data from __NEXT_DATA__.
        
        Args:
            data: Parsed __NEXT_DATA__ JSON
            
        Returns:
            Product dictionary or None if not found
        """
        try:
            product_raw = data["props"]["pageProps"]["initialData"]["data"]["product"]
            reviews_raw = data["props"]["pageProps"]["initialData"]["data"].get("reviews")
            
            # Filter to wanted keys
            wanted_keys = [
                "availabilityStatus", "averageRating", "brand", "id",
                "imageInfo", "manufacturerName", "name", "orderLimit",
                "orderMinLimit", "priceInfo", "shortDescription", "type"
            ]
            product = {k: v for k, v in product_raw.items() if k in wanted_keys}
            
            return {
                "product": product,
                "reviews": reviews_raw
            }
        except KeyError as e:
            logger.error(f"Failed to parse product page: {e}")
            return None
    
    def scrape_search(
        self,
        query: str = "",
        category_id: Optional[str] = None,
        max_pages: Optional[int] = None,
        sort: str = "best_match",
        delay: float = 2.0
    ) -> List[Dict]:
        """
        Scrape search results.
        
        Args:
            query: Search query (empty for category browsing)
            category_id: Optional category ID to filter by
            max_pages: Maximum pages to scrape (None = all)
            sort: Sort order
            delay: Delay between requests in seconds
            
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
        
        # Scrape first page
        logger.info(f"Fetching page 1: {url}")
        response = self.session.get(url, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch page 1: {response.status_code}")
            if response.status_code in [403, 412, 429]:
                logger.error("Bot detection triggered - cookies may be expired")
            return all_results
        
        # Check for blocked page
        if '/blocked' in response.url or 'Access Denied' in response.text[:1000]:
            logger.error("Request blocked by bot detection")
            return all_results
        
        # Extract __NEXT_DATA__
        data = self._extract_next_data(response.text)
        if not data:
            logger.error("Failed to extract __NEXT_DATA__ from page")
            return all_results
        
        # Parse search results
        parsed = self.parse_search_results(data)
        all_results.extend(parsed["results"])
        total_results = parsed["total_results"]
        
        logger.info(f"Page 1: Found {len(parsed['results'])} items (total: {total_results})")
        
        # Calculate total pages
        items_per_page = 40
        total_pages = math.ceil(total_results / items_per_page)
        
        # Walmart caps search at 25 pages
        if total_pages > 25:
            total_pages = 25
        
        if max_pages and max_pages < total_pages:
            total_pages = max_pages
        
        # Scrape remaining pages
        for page in range(2, total_pages + 1):
            time.sleep(delay)
            
            if category_id:
                url = self._make_browse_url(category_id, page=page)
            else:
                url = self._make_search_url(query, page=page, sort=sort)
            
            logger.info(f"Fetching page {page}/{total_pages}...")
            response = self.session.get(url, timeout=30)
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch page {page}: {response.status_code}")
                continue
            
            data = self._extract_next_data(response.text)
            if not data:
                logger.warning(f"Failed to extract __NEXT_DATA__ from page {page}")
                continue
            
            parsed = self.parse_search_results(data)
            all_results.extend(parsed["results"])
            logger.info(f"Page {page}: Found {len(parsed['results'])} items")
        
        logger.info(f"Total scraped: {len(all_results)} products")
        return all_results
    
    def scrape_product(self, url: str) -> Optional[Dict]:
        """
        Scrape a single product page.
        
        Args:
            url: Product page URL
            
        Returns:
            Product dictionary or None
        """
        logger.info(f"Scraping product: {url}")
        response = self.session.get(url, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch product: {response.status_code}")
            return None
        
        data = self._extract_next_data(response.text)
        if not data:
            return None
        
        return self.parse_product_page(data)


def main():
    parser = argparse.ArgumentParser(
        description='Scrape Walmart using __NEXT_DATA__ extraction',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--query', '-q', help='Search query')
    parser.add_argument('--category', '-c', help='Category ID to browse')
    parser.add_argument('--max-pages', type=int, default=2, help='Max pages to scrape')
    parser.add_argument('--delay', type=float, default=2.0, help='Delay between requests')
    parser.add_argument('--output', '-o', help='Output JSON file')
    parser.add_argument('--cookies', help='Cookie string (name=value; name2=value2)')
    parser.add_argument('--cookies-from-curl', help='Extract cookies from cURL command')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Parse cookies
    cookies = None
    if args.cookies_from_curl:
        cookies = WalmartHTMLScraper.parse_cookies_from_curl(args.cookies_from_curl)
        logger.info(f"Parsed {len(cookies)} cookies from cURL")
    elif args.cookies:
        cookies = {}
        for cookie in args.cookies.split(';'):
            if '=' in cookie:
                name, value = cookie.strip().split('=', 1)
                cookies[name] = value
    
    # Initialize scraper
    scraper = WalmartHTMLScraper(cookies=cookies)
    
    # Scrape
    if args.query or args.category:
        results = scraper.scrape_search(
            query=args.query or "",
            category_id=args.category,
            max_pages=args.max_pages,
            delay=args.delay
        )
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Saved {len(results)} products to {args.output}")
        else:
            # Print summary
            print(f"\n{'='*60}")
            print(f"SCRAPE RESULTS")
            print(f"{'='*60}")
            print(f"Query: {args.query or 'N/A'}")
            print(f"Category: {args.category or 'N/A'}")
            print(f"Products found: {len(results)}")
            
            if results:
                print(f"\nFirst 5 products:")
                for i, item in enumerate(results[:5]):
                    name = item.get('name', 'Unknown')[:50]
                    price_info = item.get('priceInfo', {})
                    current_price = price_info.get('currentPrice', {})
                    price = current_price.get('price', 'N/A')
                    print(f"  {i+1}. {name}... - ${price}")
            print(f"{'='*60}")
    else:
        parser.print_help()
        print("\nError: Please provide --query or --category")


if __name__ == '__main__':
    main()

