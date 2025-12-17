#!/usr/bin/env python3
"""
Target product scraper.

This scraper:
- Uses Target's Redsky REST API to discover categories and scrape products
- Fetches UPCs via PDP endpoint for each product
- Fetches aisle locations via fulfillment endpoint
- Filters to grocery categories only
- Stores products in Supabase database

Usage:
    python3 scrapers/target_scraper.py --store-id 95
    python3 scrapers/target_scraper.py --store-id 95 --dry-run --max-items 100
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.base_scraper import BaseScraper
from core.category_mapping import TARGET_CATEGORY_MAP

# Configure logging with file handler for remote execution
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, f'target_scrape_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

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


class TargetClient:
    """REST client for Target's Redsky API."""
    
    BASE_URL = "https://redsky.target.com/redsky_aggregations/v1"
    
    def __init__(self, api_key: str, store_id: str = "95"):
        """
        Initialize the Target API client.
        
        Args:
            api_key: Target Redsky API key
            store_id: Target store ID (default: 95 - Austin North)
        """
        self.api_key = api_key
        self.store_id = store_id
        self.session = requests.Session()
        
        # Setup retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set headers to mimic browser
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.target.com',
            'Referer': 'https://www.target.com/',
        })
    
    def search(
        self,
        category_id: str,
        offset: int = 0,
        count: int = 24,
        keyword: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Search for products in a category.
        
        Args:
            category_id: Target category ID (e.g., "5xsy9" for Snacks)
            offset: Pagination offset
            count: Number of items per page
            keyword: Optional search keyword
            
        Returns:
            API response dict or None on error
        """
        url = f"{self.BASE_URL}/web/plp_search_v2"
        
        params = {
            'key': self.api_key,
            'category': category_id,
            'channel': 'WEB',
            'count': count,
            'default_purchasability_filter': 'true',
            'include_dmc_dmr': 'true',
            'include_sponsored': 'true',
            'offset': offset,
            'page': f'/c/{category_id}',
            'platform': 'desktop',
            'pricing_store_id': self.store_id,
            'scheduled_delivery_store_id': self.store_id,
            'store_ids': self.store_id,
            'useragent': 'Mozilla/5.0',
            'visitor_id': 'GUEST',
        }
        
        if keyword:
            params['keyword'] = keyword
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            # 206 is Partial Content - valid response even with some errors
            if response.status_code not in (200, 206):
                response.raise_for_status()
            
            data = response.json()
            
            # Log errors but don't fail - products may still be available
            if 'errors' in data and data['errors']:
                error_messages = [e.get('message', 'Unknown error') for e in data['errors']]
                logger.debug(f"API returned errors (but continuing): {error_messages}")
            
            return data
            
        except requests.exceptions.Timeout:
            logger.error(f"Search request timed out for category {category_id}")
            return None
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                logger.warning(f"Rate limited on search request, waiting longer...")
                time.sleep(10)
            logger.error(f"Search request failed (HTTP {e.response.status_code}): {e}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Search request failed: {e}")
            return None
    
    def get_product_details(self, tcin: str) -> Optional[Dict[str, Any]]:
        """
        Get product details including UPC (primary_barcode).
        
        Args:
            tcin: Target item ID
            
        Returns:
            Product data dict or None on error
        """
        url = f"{self.BASE_URL}/web/pdp_client_v1"
        
        params = {
            'key': self.api_key,
            'tcin': tcin,
            'store_id': self.store_id,
            'pricing_store_id': self.store_id,
            'scheduled_delivery_store_id': self.store_id,
        }
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.debug(f"PDP request failed for {tcin}: {e}")
            return None
        except Exception as e:
            logger.debug(f"Unexpected error in PDP request for {tcin}: {e}")
            return None
    
    def get_fulfillment(self, tcin: str) -> Optional[Dict[str, Any]]:
        """
        Get fulfillment info including aisle location.
        
        Args:
            tcin: Target item ID
            
        Returns:
            Fulfillment data dict or None on error
        """
        url = f"{self.BASE_URL}/web/product_fulfillment_and_variation_hierarchy_v1"
        
        params = {
            'key': self.api_key,
            'tcin': tcin,
            'store_id': self.store_id,
            'required_store_id': self.store_id,
            'pricing_store_id': self.store_id,
            'scheduled_delivery_store_id': self.store_id,
        }
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.debug(f"Fulfillment request failed for {tcin}: {e}")
            return None
        except Exception as e:
            logger.debug(f"Unexpected error in fulfillment request for {tcin}: {e}")
            return None


class TargetScraper(BaseScraper):
    """Scraper for Target products using Redsky REST API."""
    
    DEFAULT_DELAY = 1.5
    DEFAULT_DELAY_VARIANCE = 0.5
    DEFAULT_PAGE_SIZE = 24
    MAX_WORKERS = 5  # For parallel PDP/fulfillment calls
    
    def __init__(
        self,
        store_id: Optional[str] = None,
        api_key: Optional[str] = None,
        dry_run: bool = True,  # Default to dry-run for safety
        rate_limit_delay: float = DEFAULT_DELAY,
        rate_limit_variance: float = DEFAULT_DELAY_VARIANCE,
        max_items: Optional[int] = None,
        skip_details: bool = False
    ):
        """
        Initialize the Target scraper.
        
        Args:
            store_id: Target store ID (default: 95 - Austin North)
            api_key: Target API key (default from env)
            dry_run: If True, skip Supabase storage and only log products (default: True)
            rate_limit_delay: Base delay between requests (seconds)
            rate_limit_variance: Random variance in delay (seconds)
            max_items: Maximum items to scrape (None = no limit)
            skip_details: If True, skip PDP/fulfillment calls (faster, no UPC/aisle)
        """
        # Get config from environment if not provided
        # Default to Austin North store (95) for consistency
        self.store_id = store_id or os.getenv('TARGET_STORE_ID', '95')
        self.api_key = api_key or os.getenv('TARGET_API_KEY', '9f36aeafbe60771e321a7cc95a78140772ab3e96')
        self.skip_details = skip_details
        
        # Initialize base scraper
        super().__init__(
            retailer_name='target',
            store_id=self.store_id,
            dry_run=dry_run,
            rate_limit_delay=rate_limit_delay,
            rate_limit_variance=rate_limit_variance,
            max_items=max_items
        )
        
        self.page_size = self.DEFAULT_PAGE_SIZE
        
        # Initialize API client
        self.client = TargetClient(api_key=self.api_key, store_id=self.store_id)
        
        # JSON output file for saving all products (always save to JSON, even in dry-run)
        self.json_output_file = 'target_products.json'
        self.all_products = []  # Store all products for JSON export
        
        # Load existing products if resuming
        if os.path.exists(self.json_output_file):
            try:
                with open(self.json_output_file) as f:
                    existing_data = json.load(f)
                    self.all_products = existing_data.get('products', [])
                    existing_ids = {p.get('product_id') for p in self.all_products if p.get('product_id')}
                    self.discovered_product_ids.update(existing_ids)
                    logger.info(f"Loaded {len(self.all_products)} existing products from {self.json_output_file}")
            except Exception as e:
                logger.warning(f"Could not load existing JSON file: {e}")
        
        logger.info(f"Initialized Target scraper (store_id: {self.store_id}, dry_run: {self.dry_run})")
        logger.info(f"Products will be saved to: {self.json_output_file}")
        if not self.dry_run:
            logger.info("Products will ALSO be saved directly to Supabase during scraping")
    
    def run(self, strategy: str = 'categories', start_from_category: int = 0) -> Dict[str, int]:
        """
        Run the Target scraper with resume support.
        
        Args:
            strategy: Scraping strategy ('categories', 'search', or 'both')
            start_from_category: Category index to start from (0-based, for resuming)
            
        Returns:
            Dictionary with scraping statistics
        """
        logger.info("=" * 60)
        logger.info("TARGET Product Scraper")
        logger.info("=" * 60)
        
        start_time = time.time()
        
        if strategy in ['categories', 'both']:
            categories = self.discover_categories()
            categories = self.filter_grocery_categories(categories)
            
            if start_from_category > 0:
                logger.info(f"Resuming from category {start_from_category + 1}/{len(categories)}")
                categories = categories[start_from_category:]
            
            logger.info(f"Scraping {len(categories)} grocery categories...")
            
            for i, category in enumerate(categories, start_from_category):
                if self.max_items and self.scraped_count >= self.max_items:
                    logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                    break
                
                logger.info(f"Processing category {i + 1}/{len(categories) + start_from_category}: {category.get('name', 'Unknown')}")
                self.scrape_category(category)
                
                # Rate limiting between categories
                if i + 1 < len(categories) + start_from_category:
                    delay = self._get_random_delay()
                    time.sleep(delay)
        
        # Final save to JSON
        self._save_json_file()
        
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
        logger.info(f"  💾 Saved {len(self.all_products)} products to {self.json_output_file}")
        logger.info("=" * 60)
        
        return stats
    
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover product categories from Target.
        
        Uses the TARGET_CATEGORY_MAP which contains all mapped grocery categories.
        
        Returns:
            List of category dictionaries with name, parent, and id fields.
        """
        logger.info("Discovering categories from Target...")
        
        categories = []
        
        # Category IDs from Target's API (extracted from complete_hierarchy.json)
        # These are the node_ids used in the category URLs
        CATEGORY_IDS = {
            # Parent category: {subcategory_name: category_id}
            'Baby Food': {'Baby Food': '5xt0a'},
            'Bakery & Bread': {
                'Bagels': '4smkx',
                'Breads': '5xt18',
                'Cakes & Pies': '3tyea',
                'Cookies & Bars': '5xt17',
                'Donuts & Pastries': '5xt15',
                'Muffins': 'yknno',
                'Pizza Crusts': '5xt14',
                'Refrigerated Doughs': '4tgo6',
                'Rolls & Buns': 'c51ff',
                'Snack Cakes': '5xsxz',
                'Tortillas, Pitas & Wraps': '4ss7f',
            },
            'Beverages': {
                'Cocoa': '4yi5n',
                'Coffee': '4yi5p',
                'Coffee Creamers': '5xszv',
                'Cold Brew & Bottled Coffee': '260b3',
                'Drink Mixes': '5xt0n',
                'Energy Drinks': '4uez2',
                'Espresso': '2dpp9',
                'Ground Coffee': 'x2hqv',
                'Instant Coffee': '05hso',
                'Juice & Cider': '5xt0o',
                'K-Cups & Coffee Pods': '6kpkn',
                'Meal Replacement Drinks': '4uez0',
                'Milk': '5xszh',
                'Milk Substitutes': 'zkvwk',
                'Non-Alcoholic Drinks': 'gjl0q',
                'Protein Powders': '4rsq3',
                'Soda & Pop': '5xt0m',
                'Sports Drinks': '75dvf',
                'Tea': '4yi5o',
                'Water': '5xt0k',
                'Whole Bean Coffee': 'n8upo',
            },
            'Breakfast & Cereal': {
                'Cereal': '5xt0g',
                'Granola': 'in6al',
                'Oatmeal': '8tu6y',
                'Pancake Mixes, Waffle Mixes & Syrup': '5xt0f',
                'Toaster Pastries & Breakfast Bars': '5xt0i',
            },
            'Candy': {
                'Chocolate Candy': '5xt0b',
                'Christmas Candy & Treats': 'iywcd',
                'Freeze Dried Candy': 'ojrvg',
                'Gum & Mints': '5xt0a',
                'Gummy & Chewy Candy': '5xt09',
                'Hard Candy': '5xt08',
                'Sour Candy': 'r498f',
            },
            'Coffee': {
                'Coffee Creamers': '5xszv',
                'Cold Brew & Bottled Coffee': '260b3',
                'Espresso': '2dpp9',
                'Ground Coffee': 'x2hqv',
                'Instant Coffee': '05hso',
                'K-Cups & Coffee Pods': '6kpkn',
                'Whole Bean Coffee': 'n8upo',
            },
            'Dairy': {
                'Butter & Margarine': '5xszl',
                'Cheese': '5xszk',
                'Coffee Creamers': '5xszv',
                'Cottage Cheese': '4tgo9',
                'Cream & Whipped Toppings': '5xszj',
                'Cream Cheese': '4tgo8',
                'Desserts & Puddings': 'ab90f',
                'Eggs': '5xszi',
                'Milk': '5xszh',
                'Milk Substitutes': 'zkvwk',
                'Refrigerated Doughs': '4tgo6',
                'Sour Cream & Dips': '5xszg',
                'Yogurt': '5xszf',
            },
            'Deli': {
                'Artisan Cheese & Cured Meats': 'czzeu',
                'Fresh Dips, Salsas & Hummus': 'cjg5k',
                'Fresh Soups': 'p2osw',
                'Meal Kits': 'fql6w',
                'Packaged Lunch Meat': '4tgi6',
                'Party Trays': 'tgba0',
                'Prepared Meals & Sides': '7dopp',
                'Prepared Salads & Sandwiches': 'mdt7r',
                'Sliced Deli Meat & Deli Cheese': 'zomk2',
                'Snack Packs & On the Go Snacks': 'dhjbd',
            },
            'Frozen Foods': {
                'Frozen Appetizers & Snacks': '5xszb',
                'Frozen Beef': '1fu00',
                'Frozen Bread & Dough': '4tglw',
                'Frozen Breakfast Food': '5xsza',
                'Frozen Chicken': 'zmsrg',
                'Frozen Desserts': '5xsz9',
                'Frozen Family Meals': 'a3dpa',
                'Frozen Fish & Seafood': 'cs8z5',
                'Frozen Fruit': '5xsz7',
                'Frozen Meat, Poultry & Seafood': '5xsz5',
                'Frozen Meatless Alternatives': '7taqq',
                'Frozen Pizza': '5xsz4',
                'Frozen Potatoes': 'a479c',
                'Frozen Single Serve Meals': 'wdysv',
                'Frozen Turkey': 'bmm3h',
                'Frozen Vegetables': '5xsz3',
                'Ice Cream & Novelties': '5xsz2',
            },
            'Meat & Seafood': {
                'Bacon': '4tgi9',
                'Beef': '4tgi8',
                'Chicken': '4tgi7',
                'Fish & Seafood': '4tgi0',
                'Ham': 'f2cgx',
                'Hot Dogs': '4tgi5',
                'Meatless Alternatives': '4tgi3',
                'Packaged Lunch Meat': '4tgi6',
                'Pork': '4tgi2',
                'Sausages': 'p9cdq',
                'Sliced Deli Meat & Deli Cheese': 'zomk2',
                'Turkey': '4tghz',
            },
            'Pantry': {
                'Baking Chips & Cocoa': '5xt12',
                'Baking Kits & Mixes': '5xt11',
                'Baking Powder, Baking Soda & Yeast': '5xt0s',
                'Baking Staples': '4u9lv',
                'Boxed Meals & Side Dishes': '5xsyf',
                'Canned & Packaged Foods': '5xt05',
                'Canned Fruit': '6peje',
                'Canned Meat': '2m8ve',
                'Canned Tuna & Seafood': '7yq1l',
                'Canned Vegetables': 'sl97t',
                'Condensed & Powdered Milk': '5xt03',
                'Condiments': '5xszw',
                'Cooking Oil & Vinegar': '4u9ly',
                'Extracts & Food Coloring': '4u9lt',
                'Flours & Meals': '4u9lu',
                'Frosting & Icing': '4u9ls',
                'Fruit Spreads, Jams & Jellies': '58bef',
                'Herbs, Rubs & Spices': '4u9lf',
                'Marshmallows': '5xt0v',
                'Nut Butters': 'mnyf1',
                'Nuts': 'tc851',
                'Olives, Pickles & Peppers': '40p8x',
                'Pasta, Rice & Grains': '5xsyc',
                'Peanut Butter & Spreads': '5xszr',
                'Pie Crusts & Filling': '4u9lr',
                'Salad Dressings': 'zqc4',
                'Salsa & Dips': '5xsy5',
                'Sauces & Marinades': '4tg6h',
                'Soups, Broth & Chili': '5xszx',
                'Spices & Seasonings': '5xszu',
                'Sprinkles, Candles & Decorations': '5xt0z',
                'Sugar & Sweeteners': '5xt0u',
                'Syrups & Sauces': '5xt0w',
            },
            'Fruit & vegetables': {
                'Fresh Dressings & Dips': 'flfjt',
                'Fresh Fruit': '4tglt',
                'Fresh Juices': 'c5lky',
                'Fresh Vegetables': '4tglh',
                'Meatless Alternatives': '4tgi3',
                'Salad Mixes': 'by5pi',
            },
            'Snacks': {
                'Chips': '5xsy7',
                'Cookies': '54v3e',
                'Crackers': '5xsy6',
                'Fruit Snacks': '5xsy4',
                'Jerky': 'yh744',
                'Meat Sticks': '5xsy2',
                'Nuts': 'tc851',
                'Popcorn': '5xsy0',
                'Pretzels': 'f7azc',
                'Protein Bars': '4rsq0',
                'Rice Cakes': 'rdb7b',
                'Salsa & Dips': '5xsy5',
                'Snack & Granola Bars': '4ydo1',
                'Snack Mix': 'ps6um',
                'Snack Variety Packs': 'sjs32',
                'Trail Mix': '5xsy1',
            },
        }
        
        # Build categories from the mapping
        for parent_name, subcategories in TARGET_CATEGORY_MAP.items():
            parent_ids = CATEGORY_IDS.get(parent_name, {})
            
            for subcategory_name in subcategories.keys():
                category_id = parent_ids.get(subcategory_name)
                
                if category_id:
                    categories.append({
                        'name': subcategory_name,
                        'parent': parent_name,
                        'id': category_id,
                    })
                else:
                    # Log categories without IDs for debugging
                    logger.debug(f"No category ID for: {parent_name} > {subcategory_name}")
        
        logger.info(f"Discovered {len(categories)} categories from Target category mapping")
        return categories
    
    def _fetch_product_details_batch(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Fetch UPC and aisle location for a batch of products in parallel.
        
        Args:
            products: List of product dicts with basic info from search
            
        Returns:
            List of products with UPC and aisle data added
        """
        if self.skip_details:
            return products
        
        def fetch_details(product: Dict[str, Any]) -> Dict[str, Any]:
            """Fetch PDP and fulfillment data for a single product."""
            tcin = product.get('tcin')
            if not tcin:
                return product
            
            # Fetch PDP for UPC and additional fields per documentation
            pdp_data = self.client.get_product_details(tcin)
            if pdp_data:
                pdp_product = pdp_data.get('data', {}).get('product', {})
                item = pdp_product.get('item', {})
                price = pdp_product.get('price', {})
                ratings = pdp_product.get('ratings_and_reviews', {})
                stats = ratings.get('statistics', {}) if ratings else {}
                rating_data = stats.get('rating', {}) if stats else {}
                
                # Extract all required fields per retailer-scraping-guide.md
                product['primary_barcode'] = item.get('primary_barcode')
                product['dpci'] = item.get('dpci')
                product['list_price'] = price.get('reg_retail')
                product['price_per_unit'] = price.get('formatted_unit_price')  # e.g., "$0.95"
                product['price_per_unit_uom'] = price.get('formatted_unit_price_suffix')  # e.g., "/ounce"
                product['rating'] = rating_data.get('average')
                product['review_count'] = stats.get('review_count')
            
            # Fetch fulfillment for aisle location
            # Per docs: data.product_fulfillment.store_options[].store_positions[]
            # But sample shows: data.product.store_positions[] directly
            # Try both paths for compatibility
            fulfillment_data = self.client.get_fulfillment(tcin)
            if fulfillment_data:
                data = fulfillment_data.get('data', {})
                
                # Try fulfillment API path first (per docs)
                product_fulfillment = data.get('product_fulfillment', {})
                store_options = product_fulfillment.get('store_options', [])
                
                if store_options:
                    for option in store_options:
                        positions = option.get('store_positions', [])
                        if positions:
                            pos = positions[0]
                            product['store_aisle'] = pos.get('aisle')
                            product['store_block'] = pos.get('block')
                            product['store_floor'] = pos.get('floor')
                            break
                else:
                    # Fallback: direct path (from sample)
                    fp = data.get('product', {})
                    store_positions = fp.get('store_positions', [])
                    if store_positions:
                        pos = store_positions[0]
                        product['store_aisle'] = pos.get('aisle')
                        product['store_block'] = pos.get('block')
                        product['store_floor'] = pos.get('floor')
            
            return product
        
        # Use ThreadPoolExecutor for parallel fetching
        with ThreadPoolExecutor(max_workers=self.MAX_WORKERS) as executor:
            futures = {executor.submit(fetch_details, p): p for p in products}
            results = []
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    logger.error(f"Error fetching product details: {e}")
                    results.append(futures[future])
        
        return results
    
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
        offset = 0
        
        while True:
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                break
            
            # Rate limiting
            delay = self._get_random_delay()
            logger.debug(f"Waiting {delay:.2f}s before offset {offset}...")
            time.sleep(delay)
            
            # Make search request
            page_num = (offset // self.page_size) + 1
            logger.info(f"  Fetching page {page_num} (offset {offset})...")
            
            response = self.client.search(
                category_id=category_id,
                offset=offset,
                count=self.page_size
            )
            
            if not response:
                logger.error(f"  Failed to fetch offset {offset}")
                if offset == 0:
                    logger.warning(f"  Failed on first page, skipping category")
                break
            
            # Extract products from response
            # Products are at data.search.products, metadata at data.search.search_response.metadata
            search_data = response.get('data', {}).get('search', {})
            products = search_data.get('products', [])
            
            # Get total results from metadata
            search_response = search_data.get('search_response', {})
            metadata = search_response.get('metadata', {})
            total_results = metadata.get('total_results', 0)
            
            if not products:
                logger.info(f"  No products found at offset {offset}, stopping")
                break
            
            logger.info(f"  Found {len(products)} products (total: {total_results})")
            
            # Extract basic product data
            basic_products = []
            for product in products:
                if self.max_items and self.scraped_count + len(basic_products) >= self.max_items:
                    break
                
                basic = self._extract_basic_product_data(product)
                if basic and basic['tcin'] not in self.discovered_product_ids:
                    basic['category_name'] = category_name
                    basic['parent_category'] = parent_name
                    basic_products.append(basic)
            
            if not basic_products:
                logger.info(f"  No new products to process")
                offset += self.page_size
                if offset >= total_results:
                    break
                continue
            
            # Fetch UPC and aisle for batch
            if not self.skip_details:
                logger.info(f"  Fetching details for {len(basic_products)} products...")
                basic_products = self._fetch_product_details_batch(basic_products)
            
            # Store each product
            for product in basic_products:
                if self.max_items and self.scraped_count >= self.max_items:
                    break
                
                normalized = self.extract_product_data(product)
                if normalized:
                    # Always save to JSON file (even in dry-run)
                    self.all_products.append(normalized)
                    
                    # Also save to Supabase if not in dry-run
                    # (Unlike Central Market which saves to JSON first, then imports separately)
                    if self.dry_run:
                        # In dry-run, just log and count
                        logger.info(f"  [DRY-RUN] Would store product: {normalized.get('name', 'Unknown')} (ID: {normalized.get('product_id', 'N/A')})")
                        category_scraped += 1
                        self.scraped_count += 1
                    else:
                        # Not in dry-run: save to Supabase AND JSON
                        if self.store_product_in_supabase(normalized):
                            category_scraped += 1
                            self.scraped_count += 1
                        else:
                            self.failed_count += 1
                    
                    # Periodically save JSON file (every 100 products)
                    if len(self.all_products) % 100 == 0:
                        self._save_json_file()
                else:
                    self.failed_count += 1
            
            # Check if we should continue
            offset += self.page_size
            if offset >= total_results:
                logger.info(f"  Reached end of category ({total_results} total)")
                break
            
            # Periodic progress report for long-running scrapes
            if category_scraped > 0 and category_scraped % 100 == 0:
                logger.info(f"  Progress: {category_scraped} items scraped so far in this category")
        
        logger.info(f"  Category complete: {category_scraped} items scraped")
        
        # Save JSON after each category
        self._save_json_file()
        
        return category_scraped
    
    def _save_json_file(self):
        """Save all products to JSON file."""
        try:
            output = {
                'metadata': {
                    'retailer': 'target',
                    'store_id': self.store_id,
                    'store_name': 'Austin North',
                    'scraped_at': datetime.utcnow().isoformat(),
                    'total_products': len(self.all_products),
                    'products_with_upc': sum(1 for p in self.all_products if p.get('upc')),
                    'products_with_aisle': sum(1 for p in self.all_products if p.get('store_aisle')),
                    'dry_run': self.dry_run,
                },
                'products': self.all_products,
            }
            
            with open(self.json_output_file, 'w') as f:
                json.dump(output, f, indent=2, default=str)
            
            logger.debug(f"Saved {len(self.all_products)} products to {self.json_output_file}")
        except Exception as e:
            logger.error(f"Error saving JSON file: {e}", exc_info=True)
    
    def _extract_basic_product_data(self, product: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract basic product data from search response item.
        
        Args:
            product: Product item from search response
            
        Returns:
            Dict with basic product fields or None
        """
        try:
            tcin = product.get('tcin')
            if not tcin:
                return None
            
            item = product.get('item', {})
            enrichment = item.get('enrichment', {})
            images = enrichment.get('images', {})
            product_desc = item.get('product_description', {})
            primary_brand = item.get('primary_brand', {})
            price_data = product.get('price', {})
            
            name = product_desc.get('title', '').strip()
            if not name:
                return None
            
            return {
                'tcin': tcin,
                'name': name,
                'brand': primary_brand.get('name'),
                'image_url': images.get('primary_image_url', ''),
                'price': price_data.get('current_retail'),
                'unit_price': price_data.get('formatted_unit_price'),
                'raw_data': product,
            }
            
        except Exception as e:
            logger.error(f"Error extracting basic product data: {e}")
            return None
    
    def extract_product_data(self, product_data: Dict[str, Any], category_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Extract normalized product data for storage.
        
        Args:
            product_data: Product dict with basic info and optional UPC/aisle
            category_name: Override category name (used by base scraper signature)
            
        Returns:
            Normalized product dictionary with required fields
        """
        try:
            tcin = product_data.get('tcin')
            if not tcin:
                return None
            
            # Skip if already processed
            if tcin in self.discovered_product_ids:
                return None
            
            name = product_data.get('name', '').strip()
            if not name:
                return None
            
            # Extract size from unit price string (e.g., "$1.05/ounce")
            size = None
            unit_price = product_data.get('unit_price', '')
            if unit_price and '/' in unit_price:
                size = unit_price.split('/')[-1].strip()
            
            # Extract price_per_unit value (strip "$" from formatted_unit_price)
            price_per_unit = product_data.get('price_per_unit', '')
            price_per_unit_value = None
            if price_per_unit and price_per_unit.startswith('$'):
                try:
                    price_per_unit_value = float(price_per_unit.replace('$', '').strip())
                except (ValueError, AttributeError):
                    pass
            
            return {
                'product_id': tcin,
                'name': name,
                'image_url': product_data.get('image_url', ''),
                'upc': product_data.get('primary_barcode'),
                'size': size,
                'price': product_data.get('price'),  # cost_price (current_retail)
                'list_price': product_data.get('list_price'),  # reg_retail
                'price_per_unit': price_per_unit_value,  # parsed from formatted_unit_price
                'price_per_unit_uom': product_data.get('price_per_unit_uom'),  # formatted_unit_price_suffix
                'brand': product_data.get('brand'),
                'dpci': product_data.get('dpci'),
                'rating': product_data.get('rating'),
                'review_count': product_data.get('review_count'),
                'category_name': category_name or product_data.get('category_name', ''),
                'parent_category': product_data.get('parent_category'),
                'store_aisle': product_data.get('store_aisle'),
                'store_block': product_data.get('store_block'),
                'store_floor': product_data.get('store_floor'),
                'raw_data': product_data.get('raw_data'),
            }
            
        except Exception as e:
            logger.error(f"Error extracting product data: {e}", exc_info=True)
            return None


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Scrape Target products using Redsky REST API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scrapers/target_scraper.py --store-id 95
  python3 scrapers/target_scraper.py --store-id 95 --dry-run --max-items 100
  python3 scrapers/target_scraper.py --skip-details --max-items 500
        """
    )
    
    parser.add_argument(
        '--store-id',
        default=os.getenv('TARGET_STORE_ID', '95'),
        help='Target store ID (default: 95 - Austin North)'
    )
    
    parser.add_argument(
        '--api-key',
        default=os.getenv('TARGET_API_KEY', '9f36aeafbe60771e321a7cc95a78140772ab3e96'),
        help='Target Redsky API key (default: from env or hardcoded)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=TargetScraper.DEFAULT_DELAY,
        help=f'Base delay between requests in seconds (default: {TargetScraper.DEFAULT_DELAY})'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=TargetScraper.DEFAULT_DELAY_VARIANCE,
        help=f'Random variance in delay in seconds (default: {TargetScraper.DEFAULT_DELAY_VARIANCE})'
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
        '--skip-details',
        action='store_true',
        help='Skip PDP/fulfillment calls (faster, but no UPC or aisle location)'
    )
    
    parser.add_argument(
        '--start-from-category',
        type=int,
        default=0,
        help='Category index to start from (0-based, for resuming). Default: 0'
    )
    
    parser.add_argument(
        '--json-output',
        type=str,
        default='target_products.json',
        help='JSON output file path (default: target_products.json)'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Handle dry-run flag (default True, can be disabled with --no-dry-run)
    # Default to True for safety, only disable if --no-dry-run is explicitly set
    dry_run = not args.no_dry_run
    
    logger.info("=" * 60)
    logger.info("TARGET SCRAPER CONFIGURATION")
    logger.info("=" * 60)
    logger.info(f"Store ID: {args.store_id} (Austin North)")
    logger.info(f"Dry Run: {dry_run}")
    logger.info(f"Max Items: {args.max_items or 'Unlimited'}")
    logger.info(f"Skip Details: {args.skip_details}")
    logger.info(f"Log File: {log_file}")
    logger.info("=" * 60)
    
    # Initialize scraper
    scraper = TargetScraper(
        store_id=args.store_id,
        api_key=args.api_key,
        dry_run=dry_run,
        rate_limit_delay=args.delay,
        rate_limit_variance=args.delay_variance,
        max_items=args.max_items,
        skip_details=args.skip_details
    )
    
    # Override JSON output file if specified
    if args.json_output:
        scraper.json_output_file = args.json_output
    
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
    print(f"Store ID: {args.store_id} (Austin North)")
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

