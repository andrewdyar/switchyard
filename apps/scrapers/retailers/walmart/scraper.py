#!/usr/bin/env python3
"""
Walmart product scraper.

This scraper:
- Uses Walmart's GraphQL API to discover categories and scrape products
- Handles cookie-based authentication with automatic refresh
- Filters to grocery categories only
- Stores products in Supabase database
- Supports remote execution

Usage:
    python3 scrapers/walmart_scraper.py --store-id 1234
    python3 scrapers/walmart_scraper.py --store-id 1234 --dry-run --max-items 100
"""

import argparse
import json
import logging
import os
import random
import sys
import time
from typing import Dict, List, Optional, Set, Any
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retailers.walmart.graphql_client import WalmartGraphQLClient, GraphQLResponse
from retailers.walmart.cookie_manager import get_cookie_manager
from core.base_scraper import BaseScraper

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class WalmartScraper(BaseScraper):
    """Scraper for Walmart products using GraphQL API."""
    
    DEFAULT_DELAY = 2.0
    DEFAULT_DELAY_VARIANCE = 0.5
    DEFAULT_PAGE_SIZE = 40
    MAX_RETRIES = 3
    
    def __init__(
        self,
        store_id: Optional[str] = None,
        dry_run: bool = False,
        rate_limit_delay: float = DEFAULT_DELAY,
        rate_limit_variance: float = DEFAULT_DELAY_VARIANCE,
        max_items: Optional[int] = None,
        proxy_manager = None
    ):
        """
        Initialize the Walmart scraper.
        
        Args:
            store_id: Walmart store ID (optional, for store-specific data)
            dry_run: If True, skip Supabase storage and only log products
            rate_limit_delay: Base delay between requests (seconds)
            rate_limit_variance: Random variance in delay (seconds)
            max_items: Maximum items to scrape (None = no limit)
        """
        # Initialize base scraper
        super().__init__(
            retailer_name='walmart',
            store_id=store_id or os.getenv('WALMART_STORE_ID'),
            dry_run=dry_run,
            rate_limit_delay=rate_limit_delay,
            rate_limit_variance=rate_limit_variance,
            max_items=max_items
        )
        
        # Walmart-specific initialization
        self.store_id = self.store_id
        self.page_size = self.DEFAULT_PAGE_SIZE
        
        # Initialize cookie manager and GraphQL client
        self.cookie_manager = get_cookie_manager()
        
        # Initialize proxy manager if not provided
        if proxy_manager is None:
            try:
                from retailers.walmart.proxy_manager import WebshareProxyManager
                self.proxy_manager = WebshareProxyManager(rotation_strategy='round-robin')
                if self.proxy_manager.proxies:
                    logger.info(f"✅ Loaded {len(self.proxy_manager.proxies)} proxies")
                else:
                    logger.info("No proxies available - running without proxy support")
                    self.proxy_manager = None
            except Exception as e:
                logger.warning(f"Could not initialize proxy manager: {e}")
                self.proxy_manager = None
        else:
            self.proxy_manager = proxy_manager
            if self.proxy_manager and self.proxy_manager.proxies:
                logger.info(f"✅ Using {len(self.proxy_manager.proxies)} proxies from configuration")
        
        # Use browser automation by default for reliable bot detection bypass
        self.client = WalmartGraphQLClient(use_browser=True, proxy_manager=self.proxy_manager)
        
        # Set cookies from cookie manager (if available)
        cookies = self.cookie_manager.get_cookies()
        if cookies:
            # Update session cookies - critical for PerimeterX
            for key, value in cookies.items():
                self.client.session.cookies.set(key, value, domain='.walmart.com', path='/')
            px_cookies = [k for k in cookies.keys() if 'px' in k.lower() or '_px' in k.lower()]
            if px_cookies:
                logger.info(f"Loaded {len(cookies)} cookies from cookie manager ({len(px_cookies)} PerimeterX cookies)")
            else:
                logger.warning(f"⚠️  Loaded {len(cookies)} cookies but no PerimeterX cookies found - may trigger bot detection")
        
        # Establish session by visiting homepage (gets PerimeterX cookies)
        # This must be done before any API calls
        # Browser automation will handle this if available
        self._establish_session()
        
        # Setup session with retry strategy
        retry_strategy = Retry(
            total=self.MAX_RETRIES,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.client.session.mount("http://", adapter)
        self.client.session.mount("https://", adapter)
        
        logger.info(f"Initialized Walmart scraper (store_id: {self.store_id or 'None'})")
    
    def _establish_session(self):
        """
        Establish a session with Walmart by visiting the homepage.
        This is CRITICAL for getting PerimeterX cookies and avoiding bot detection.
        """
        try:
            logger.info("Establishing session with Walmart (PerimeterX-aware)...")
            success = self.client._establish_session()
            if success:
                # Sync cookies from browser to requests session if available
                if self.client.browser_session and self.client.browser_session.session_established:
                    browser_cookies = self.client.browser_session.get_cookies()
                    for name, value in browser_cookies.items():
                        self.client.session.cookies.set(name, value, domain='.walmart.com', path='/')
                    # Also save to cookie manager for persistence
                    try:
                        self.cookie_manager.cookies.update(browser_cookies)
                        self.cookie_manager._save_cookies()
                    except Exception as e:
                        logger.debug(f"Could not save cookies: {e}")
                
                px_cookies = [k for k in self.client.session.cookies.keys() if 'px' in k.lower() or '_px' in k.lower()]
                if px_cookies:
                    logger.info(f"✅ Session established with {len(px_cookies)} PerimeterX cookies")
                else:
                    logger.warning("⚠️  Session established but no PerimeterX cookies - bot detection risk")
            else:
                logger.warning("⚠️  Session establishment returned False")
        except Exception as e:
            logger.warning(f"⚠️  Session establishment failed: {e}")
            logger.warning("Continuing without session - may trigger bot detection")
    
    def _build_category_path(self, category_id: str, subcategory_id: Optional[str] = None) -> Optional[str]:
        """
        Build full Walmart category path from category and subcategory IDs.
        
        Walmart category paths follow the format: "976759_{categoryId}_{subcategoryId}"
        where:
        - 976759 is the top-level "Food" category
        - categoryId is the second-level category (e.g., 976794 for Pantry, 976793 for Produce)
        - subcategoryId is the third-level subcategory (e.g., 7433209 for Canned Goods)
        
        Args:
            category_id: Second-level category ID (from documentation table)
            subcategory_id: Third-level subcategory ID (from documentation table), optional
        
        Returns:
            Full category path string (e.g., "976759_976794_7433209") or None if invalid
        """
        if not category_id or category_id == "N/A":
            return None
        
        # Validate category_id is numeric (Walmart IDs are numeric)
        if not category_id.replace('_', '').isdigit():
            logger.warning(f"Invalid category_id format: {category_id} (expected numeric)")
            return None
        
        # Top-level Food category ID
        top_level_id = "976759"
        
        # Build path: top_level_categoryId_subcategoryId
        if subcategory_id and subcategory_id != "N/A":
            # Validate subcategory_id is numeric
            if not subcategory_id.replace('_', '').isdigit():
                logger.warning(f"Invalid subcategory_id format: {subcategory_id} (expected numeric)")
                # Still build path without subcategory
                return f"{top_level_id}_{category_id}"
            return f"{top_level_id}_{category_id}_{subcategory_id}"
        else:
            # Some categories don't have subcategories, use just category ID
            return f"{top_level_id}_{category_id}"
    
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover product categories from Walmart.
        
        Uses the category mapping to get all known Walmart subcategories
        that map to Goods taxonomy. Since Walmart's API doesn't provide
        a direct category discovery endpoint, we use known categories from
        the documentation.
        
        Returns:
            List of category dictionaries with name, parent, and id fields.
            Categories are filtered to grocery-only in the base class.
            The 'id' field contains the full category path (e.g., "976759_976794_7433209").
        """
        logger.info("Discovering categories from Walmart...")
        
        from core.category_mapping import WALMART_CATEGORY_MAP
        
        categories = []
        
        # Map Goods categories to Walmart parent categories for organization
        goods_to_walmart_parent = {
            'fruit_vegetables': 'Produce',
            'meat_seafood': 'Meat & Seafood',
            'dairy_eggs': 'Dairy & Eggs',
            'bakery_bread': 'Bakery',
            'deli_prepared_food': 'Deli & Prepared Food',
            'pantry': 'Pantry',
            'frozen_food': 'Frozen',
            'beverages': 'Beverages',
            'snacks': 'Snacks'
        }
        
        # Category and subcategory IDs from Walmart documentation (docs/retailers/walmart.md)
        # Format: (category_id, subcategory_id)
        # Based on the documentation table structure
        category_mapping_data = {
            'Fresh Fruits': ('976793', '9756351'),
            'Fresh Vegetables': ('976793', '8910423'),
            'Fresh Herbs': ('976793', '3513831'),
            'Organic Produce': ('976793', '1913529'),
            'Cut Fruits & Vegetables': ('976793', '8402496'),
            'Salad Kits & Bowls': ('9538337', None),  # No subcategory ID
            'Fresh Dressings': ('976793', '9538337'),
            'Salsa & Dips': ('976793', '9538337'),
            'Plant-based Protein & Tofu': ('976793', '6919650'),
            'Beef & Lamb': ('9569500', '1730435'),
            'Pork': ('9569500', '1044143'),
            'Chicken': ('9569500', '1001443'),
            'Bacon, Hot Dogs, & Sausage': ('9569500', '2941132'),
            'Organic and Plant-Based': ('9569500', '5574987'),
            'The Seafood Shop': ('3410728', None),
            'The Beef Shop': ('6677247', None),
            'The Pork Shop': ('2543738', None),
            'Deli Meat & Cheese': ('976789', '5428795'),
            'Specialty Cheese and Charcuterie': (None, None),  # No IDs available
            'Rotisserie Chicken': ('9569500', '1001443'),
            'Hummus, Dips & Salsa': ('976789', '7056897'),
            'Chips': ('1001390', None),
            'Crackers': ('976787', '1001392'),
            'Cookies': ('1001391', None),
            'Fruit Snacks': ('976787', '1001395'),
            'Popcorn': ('976787', '1001407'),
            'Pretzels': ('976787', '1044156'),
            'Salsas & Dips': ('976787', '1001393'),
            'Canned Goods': ('976794', '7433209'),
            'Condiments': ('976794', '7981173'),
            'Pasta & Pizza': ('976794', '5403011'),
            'Herbs, spices, seasonings': ('976794', '3029941'),
            'Soup': ('976794', '8248961'),
            'Rice, grains, dried beans': ('976794', '4879140'),
            'Soda': ('1001680', None),
            'Water': ('1001659', None),
            'Juices': ('1001321', None),
            'Sports Drinks': ('976782', '1001682'),
            'Kids Drinks & Juice Boxes': ('976782', '1001321'),
            'Coffee': ('1086446', None),
            'Tea': ('1001320', None),
            'Energy Drinks': ('976782', '9357528'),
            'Drink Mixes': ('976782', '1001683'),
            'Bottled Tea': ('976782', '1001320'),
            'Tea Bags': ('976782', '1001320'),
            'Sweet Tea': ('976782', '1001320'),
            'Iced Tea & Mixes': ('976782', '1001320'),
            'Green Tea': ('976782', '1001320'),
            'Herbal Tea': ('976782', '1001320'),
            'Tea Lattes': ('976782', '1001320'),
            'Decaf Tea': ('976782', '1001320'),
            'Cold Brew Tea': ('976782', '1001320'),
            'Loose Leaf Tea': ('976782', '1001320'),
            'Black Tea': ('976782', '1001320'),
            'Matcha Tea': ('976782', '1001320'),
            'Tea K-Cups': ('976782', '1001320'),
            'Boba Tea': ('976782', '1001320'),
            'Digestion Tea': ('976782', '1001320'),
            'Immunity Tea': ('976782', '1001320'),
            'Energy Tea': ('976782', '1001320'),
            'Detox Tea': ('976782', '1001320'),
            'Relaxation': ('976782', '1001320'),
            'Great Value Tea': ('976782', '1001320'),
            'Ship to Home Coffee': ('1086446', '6683788'),
            'K-Cups & Coffee Pods': ('1086446', '1229653'),
            'Ground Coffee': ('1086446', '2174088'),
            'Whole Bean Coffee': ('1086446', '1229652'),
            'Instant Coffee': ('1086446', '1229650'),
            'Bottled Coffee': ('1086446', '1229654'),
            'Cold Brew Coffee': ('1086446', '1229654'),
            'Espresso Pods': ('1086446', '7775574'),
            'Great Value Coffee': ('1086446', '4168978'),
            'Coffee Creamers': ('9176907', '9550303'),
            'Sugars & Sweetners': ('976780', '9959366'),
            'Flavored Syrups': ('1086446', '9241711'),
            'Non Alcoholic Drinks': ('4158159', None),
            'Cereal & Granola': ('976783', '8102529'),
            'Oatmeal & Grits': ('976783', '7830606'),
            'Breakfast Breads': ('976779', '1044115'),
            'Toaster Pastries & Bars': ('976783', '8438428'),
            'Pancakes & Waffles & Syrup': ('976783', '2228922'),
            'Muffins & Pastries': ('9392773', '8196081'),
            'Artisan Bread': ('976779', '3396508'),
            'Bread': ('976779', '8399244'),
            'Pastries': ('976779', '1001456'),
            'Rolls': ('976779', '1037480'),
            'Buns': ('976779', '5829009'),
            'Bakery Cookies': ('976779', '1951361'),
            'Brownies': ('976779', '3465538'),
            'Bakery Sweets': ('976779', '4525853'),
            'Pies': ('976779', '2464018'),
            'Cakes': ('976779', '9997386'),
            'Cupcakes': ('976779', '2408821'),
            'Tortillas': ('976779', '2993335'),
            'Snack Cakes': ('976779', '9318357'),
            'Cheese': ('9176907', '1001468'),
            'Milk': ('9176907', '4405816'),
            'Cream & Creamers': ('9176907', '9550303'),
            'Yogurt': ('9176907', '1001470'),
            'Eggs': ('9176907', '1001469'),
            'Butter & Margarine': ('9176907', '1001467'),
            'Sour Cream & Chilled Dips': ('9176907', '7287191'),
            'Biscuits, Cookies, Doughs & Crusts': ('9176907', '7545972'),
            'Pudding & Gelatin': ('9176907', '3733198'),
            'Ice Cream & Novelties': ('976791', '1518625'),
            'The Ice Cream Shop': ('1439236', None),
            'Frozen Meals': ('976791', '6259087'),
            'Frozen Appetizers & Snacks': ('976791', '1272219'),
            'Frozen Produce': ('976791', '5624760'),
            'Frozen Breakfast': ('976791', '1001417'),
            'Frozen Pizza': ('976791', '2072073'),
            'Frozen Desserts': ('976791', '9551235'),
            'Frozen Meat, Seafood, & Vegetarian': ('976791', '5295075'),
            'Frozen Potatoes': ('976791', '6170090'),
            'Chocolate': ('1096070', '1224976'),
            'Gummy & chewy candy': ('1096070', '1224975'),
            'Hard candy & lollipops': ('1096070', '1224979'),
            'Multipacks & bags': ('1096070', '1224980'),
            'Gum': ('1096070', '1224977'),
            'Mints': ('1096070', '1224978'),
            'Better for you': ('1096070', '2851671'),
            'Baking Mixes': ('976780', '6314071'),
            'Sugars & Sweeteners': ('976780', '9959366'),
            'Flours & Meals': ('976780', '9959366'),
            'Baking Soda & Starch': ('976780', '9959366'),
            'Oil & Shortening': ('976780', '4930324'),
            'Yeasts': ('976780', '9959366'),
            'Baking Nuts': ('976780', '9959366'),
            'Canned & Powdered Milks': ('976780', '9959366'),
            'Baking Chocolate Chips & Cocoa': ('2710937', None),
            'Frosting & Decor': ('976780', '9959366'),
            'Extracts & Spices': ('976780', '9959366'),
            'Marshmallow': ('976780', '9959366'),
            'Top Baking Brands': ('976780', '4879413'),
        }
        
        # Build categories from the category mapping with full category paths
        for subcategory_name, (goods_category, goods_subcategory) in WALMART_CATEGORY_MAP.items():
            # Determine parent category based on Goods category
            parent = goods_to_walmart_parent.get(goods_category, 'Other')
            
            # Get category and subcategory IDs from mapping
            cat_data = category_mapping_data.get(subcategory_name)
            if cat_data:
                category_id, subcategory_id = cat_data
                # Build full category path
                full_path = self._build_category_path(category_id, subcategory_id)
            else:
                # Fallback for categories not in mapping
                full_path = None
            
            categories.append({
                'name': subcategory_name,
                'parent': parent,
                'id': full_path,  # Full path like "976759_976794_7433209"
                'category_id': cat_data[0] if cat_data else None,
                'subcategory_id': cat_data[1] if cat_data and len(cat_data) > 1 else None
            })
        
        logger.info(f"Discovered {len(categories)} categories from Walmart category mapping")
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
        # Use 'id' which contains the full category path (e.g., "976759_976794_7433209")
        category_id = category.get('id')
        
        logger.info(f"Scraping category: {category_name} (ID: {category_id or 'N/A'})")
        
        category_scraped = 0
        page = 1
        stores = self.store_id  # Single store ID as string, not list
        
        while True:
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                break
            
            # CRITICAL: Visit category page BEFORE making GraphQL API call to refresh PerimeterX cookies
            # This is essential - GraphQL API needs fresh cookies from category page visits
            if self.client.browser_session and category_id:
                base_cat_id = category_id.split('_')[0] if '_' in category_id else category_id
                category_url = f"https://www.walmart.com/cp/food/{base_cat_id}"
                try:
                    logger.debug(f"Visiting category page before API call to refresh PerimeterX cookies...")
                    self.client.browser_session.page.goto(category_url, wait_until='domcontentloaded', timeout=30000)
                    time.sleep(random.uniform(2.0, 4.0))  # Wait for cookies to be set
                    # Sync fresh cookies after category page visit
                    browser_cookies = self.client.browser_session.get_cookies()
                    for name, value in browser_cookies.items():
                        self.client.session.cookies.set(name, value, domain='.walmart.com', path='/')
                    logger.debug(f"Synced {len(browser_cookies)} cookies from category page visit")
                except Exception as e:
                    logger.warning(f"Category page visit failed: {e}")
            
            # Rate limiting - use longer delays to avoid 429 errors
            # Walmart's GraphQL API is strict on rate limits, so we need conservative delays
            base_delay = max(self.rate_limit_delay, 5.0)  # Minimum 5 seconds between requests
            delay = random.uniform(base_delay, base_delay + self.rate_limit_variance)
            # Add extra delay for later pages (rate limits accumulate)
            if page > 1:
                delay += random.uniform(1.0, 2.0) * min(page // 3, 3)  # Gradually increase delay
            logger.info(f"  Waiting {delay:.1f}s before API request (page {page})...")
            time.sleep(delay)
            
            # Make search request
            logger.info(f"  Fetching page {page} for category '{category_name}'...")
            # The category_id from discover_categories is now the full path (e.g., "976759_976794_7433209")
            # Use it directly if available
            walmart_cat_id = category_id if category_id and category_id != "N/A" else None
            
            logger.debug(f"  Search parameters: cat_id={walmart_cat_id}, page={page}, page_size={self.page_size}")
            response = self.client.search(
                query="",  # Empty query for category browsing
                stores=stores,
                sort="best_match",
                page=page,
                page_size=self.page_size,
                category_id=walmart_cat_id,
                prg="mWeb"
            )
            
            if not response.success:
                error_msg = response.errors[0]['message'] if response.errors else "Unknown error"
                logger.warning(f"  ⚠️  Failed to fetch page {page}: {error_msg[:200]}")  # Truncate long errors
                
                # Check for rate limiting (GraphQLResponse doesn't have status_code attribute)
                if "429" in error_msg or "rate limit" in error_msg.lower():
                    # Exponential backoff for rate limits - start with longer wait
                    retry_count = getattr(self, '_rate_limit_retry_count', 0)
                    backoff_time = min(30 * (2 ** retry_count), 180)  # Start at 30s, max 3 minutes
                    logger.warning(f"  ⚠️  Rate limited (429) - backing off for {backoff_time:.0f}s (retry #{retry_count + 1})...")
                    self._rate_limit_retry_count = retry_count + 1
                    time.sleep(backoff_time)
                    
                    # Visit category page to refresh cookies and reset rate limit timer
                    if self.client.browser_session and category_id:
                        try:
                            base_cat_id = category_id.split('_')[0] if '_' in category_id else category_id
                            category_url = f"https://www.walmart.com/cp/food/{base_cat_id}"
                            logger.debug("Visiting category page to reset rate limit...")
                            self.client.browser_session.page.goto(category_url, wait_until='domcontentloaded', timeout=30000)
                            time.sleep(random.uniform(3.0, 5.0))
                            # Sync fresh cookies
                            browser_cookies = self.client.browser_session.get_cookies()
                            for name, value in browser_cookies.items():
                                self.client.session.cookies.set(name, value, domain='.walmart.com', path='/')
                        except Exception as e:
                            logger.debug(f"Category page visit failed: {e}")
                    
                    # Reset retry count after successful recovery
                    if retry_count > 3:
                        logger.warning("  Too many rate limit retries, skipping category")
                        break
                    
                    # Retry the request
                    continue
                else:
                    # Reset retry count on successful request
                    self._rate_limit_retry_count = 0
                
                # If first page fails, skip category
                if page == 1:
                    logger.warning(f"  Failed to fetch first page, skipping category {category_name}")
                    break
                
                # Otherwise, assume we've reached the end
                break
            
            # Extract products from response with validation
            data = response.data
            if not data:
                logger.warning(f"  Empty response data on page {page}")
                break
            
            # Validate response structure
            if 'search' not in data:
                logger.warning(f"  Unexpected response structure on page {page}: missing 'search' key")
                logger.debug(f"  Response keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}")
                break
            
            search_data = data['search']
            if not isinstance(search_data, dict):
                logger.warning(f"  Invalid search data type on page {page}")
                break
                
            search_result = search_data.get('searchResult', {})
            if not isinstance(search_result, dict):
                logger.warning(f"  Invalid searchResult type on page {page}")
                break
                
            item_stacks = search_result.get('itemStacks', [])
            if not isinstance(item_stacks, list):
                logger.warning(f"  Invalid itemStacks type on page {page}")
                break
            
            # Extract items from all stacks
            items = []
            total_count = search_result.get('aggregatedCount', 0)
            
            for stack in item_stacks:
                stack_items = stack.get('itemsV2', [])
                if stack_items:
                    items.extend(stack_items)
                meta = stack.get('meta', {})
                stack_total = meta.get('totalItemCount', 0)
                if stack_total > total_count:
                    total_count = stack_total
            
            if not items:
                logger.info(f"  No items found on page {page}, stopping")
                break
            
            logger.info(f"  Page {page}: Found {len(items)} items (total: {total_count})")
            
            # Process each item
            for item in items:
                if self.max_items and self.scraped_count >= self.max_items:
                    break
                
                # Pass category name to extract_product_data for category mapping
                product = self.extract_product_data(item, category_name=category_name)
                if product:
                    # Store product using base scraper method
                    if self.store_product_in_supabase(product):
                        category_scraped += 1
                        self.scraped_count += 1
                    else:
                        self.failed_count += 1
                else:
                    self.failed_count += 1
            
            # Check pagination - estimate total pages from total count
            items_per_page = len(items)
            if total_count > 0 and items_per_page > 0:
                estimated_total_pages = (total_count + items_per_page - 1) // items_per_page
                if page >= estimated_total_pages:
                    logger.info(f"  Reached estimated last page ({page}/{estimated_total_pages})")
                    break
            elif items_per_page < self.page_size:
                # If we got fewer items than requested, we're probably at the end
                logger.info(f"  Got fewer items than requested ({items_per_page}/{self.page_size}), stopping")
                break
            
            page += 1
        
        logger.info(f"  Category complete: {category_scraped} items scraped")
        return category_scraped
    
    def extract_product_data(self, product_data: Dict[str, Any], category_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Extract normalized product data from Walmart API response.
        
        Args:
            product_data: Raw product data from Walmart search API
            
        Returns:
            Normalized product dictionary with required fields
        """
        try:
            # Extract product ID
            product_id = str(product_data.get('usItemId', ''))
            if not product_id:
                return None
            
            # Skip if already processed
            if product_id in self.discovered_product_ids:
                return None
            
            # Extract name
            name = product_data.get('name', '').strip()
            if not name:
                return None
            
            # Extract image URL - from imageInfo.thumbnailUrl
            image_info = product_data.get('imageInfo', {})
            image_url = image_info.get('thumbnailUrl', '') if image_info else ''
            
            # Extract price
            price = None
            price_info = product_data.get('priceInfo', {})
            if price_info:
                current_price = price_info.get('currentPrice', {})
                if current_price:
                    price = current_price.get('price')
            
            # Extract size/unit from unit price string
            size = None
            if price_info:
                unit_price = price_info.get('unitPrice', {})
                if unit_price:
                    price_string = unit_price.get('priceString', '')
                    # Extract unit from strings like "$1.47/lb"
                    if '/' in price_string:
                        size = price_string.split('/')[-1].strip()
            
            # Extract brand - can be None, so handle safely
            brand = product_data.get('brand')
            if brand:
                brand = str(brand).strip() or None
            else:
                brand = None
            
            # Extract category information
            # Use the category name passed from scrape_category (which is the Walmart subcategory name)
            # This is the subcategory name that maps to Goods taxonomy
            walmart_subcategory = category_name or 'Uncategorized'
            
            # Try to get parent category from breadCrumb if available in response
            # For now, parent is determined by the category mapping
            parent_category = None
            
            # Extract store location
            product_location = product_data.get('productLocation', [])
            store_location = None
            store_zone = None
            store_aisle = None
            if product_location and len(product_location) > 0:
                location = product_location[0]
                store_location = location.get('displayValue')
                aisle_info = location.get('aisle', {})
                if aisle_info:
                    store_zone = aisle_info.get('zone')
                    store_aisle = aisle_info.get('aisle')
            
            # UPC is not available in search results (only in PDP)
            # We'll leave it as None for now
            upc = None
            
            return {
                'product_id': product_id,
                'name': name,
                'image_url': image_url,
                'upc': upc,
                'size': size,
                'price': price,
                'brand': brand,
                'category_name': category_name,
                'parent_category': parent_category,
                'store_location': store_location,
                'store_zone': store_zone,
                'store_aisle': store_aisle,
                'raw_data': product_data
            }
            
        except Exception as e:
            logger.error(f"Error extracting product data: {e}", exc_info=True)
            return None


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Scrape Walmart products using GraphQL API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scrapers/walmart_scraper.py --store-id 1234
  python3 scrapers/walmart_scraper.py --store-id 1234 --dry-run --max-items 100
  python3 scrapers/walmart_scraper.py --delay 3.0 --delay-variance 1.0
        """
    )
    
    parser.add_argument(
        '--store-id',
        help='Walmart store ID (optional, can also use WALMART_STORE_ID env var)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=WalmartScraper.DEFAULT_DELAY,
        help=f'Base delay between requests in seconds (default: {WalmartScraper.DEFAULT_DELAY})'
    )
    
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=WalmartScraper.DEFAULT_DELAY_VARIANCE,
        help=f'Random variance in delay in seconds (default: {WalmartScraper.DEFAULT_DELAY_VARIANCE})'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable debug logging'
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
    
    parser.add_argument(
        '--proxies',
        type=str,
        help='Path to proxy file or env var name (default: auto-detect from config/proxies.json)'
    )
    
    parser.add_argument(
        '--proxy-rotation',
        type=str,
        choices=['round-robin', 'random', 'per-category'],
        default='round-robin',
        help='Proxy rotation strategy (default: round-robin)'
    )
    
    parser.add_argument(
        '--use-html-fallback',
        action='store_true',
        help='Force HTML scraping approach instead of GraphQL API'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Allow override via environment variable
    store_id = args.store_id or os.getenv('WALMART_STORE_ID')
    
    # Initialize proxy manager if specified
    proxy_manager = None
    if args.proxies:
        try:
            from retailers.walmart.proxy_manager import WebshareProxyManager
            # If it's a file path, load from file
            if os.path.exists(args.proxies):
                with open(args.proxies) as f:
                    proxy_data = json.load(f)
                    if isinstance(proxy_data, dict) and 'webshare' in proxy_data:
                        proxies = proxy_data['webshare'].get('proxies', [])
                    elif isinstance(proxy_data, list):
                        proxies = proxy_data
                    else:
                        proxies = []
                proxy_manager = WebshareProxyManager(
                    proxies=proxies,
                    rotation_strategy=args.proxy_rotation
                )
            else:
                # Treat as env var name
                proxy_env = os.getenv(args.proxies, '')
                if proxy_env:
                    import json
                    proxies = json.loads(proxy_env) if proxy_env.startswith('[') else proxy_env.split('\n')
                    proxy_manager = WebshareProxyManager(
                        proxies=proxies,
                        rotation_strategy=args.proxy_rotation
                    )
        except Exception as e:
            logger.warning(f"Could not load proxies from {args.proxies}: {e}")
    
    # Initialize scraper
    scraper = WalmartScraper(
        store_id=store_id,
        dry_run=args.dry_run,
        rate_limit_delay=args.delay,
        rate_limit_variance=args.delay_variance,
        max_items=args.max_items,
        proxy_manager=proxy_manager
    )
    
    # Run scraper
    try:
        stats = scraper.run(strategy='categories')
    except KeyboardInterrupt:
        logger.info("\n⚠️  Scraper interrupted by user")
        raise
    except Exception as e:
        logger.error(f"❌ Scraper failed with error: {e}", exc_info=True)
        raise
    finally:
        # Clean up browser session - critical for resource management
        try:
            if scraper.client and scraper.client.browser_session:
                logger.info("Cleaning up browser session...")
                scraper.client.browser_session.stop()
                logger.info("✅ Browser session cleaned up")
        except Exception as e:
            logger.warning(f"⚠️  Error cleaning up browser session: {e}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("SCRAPE SUMMARY")
    print("=" * 60)
    print(f"Store ID: {store_id or 'None'}")
    print(f"Items scraped: {stats.get('scraped', 0)}")
    print(f"Items failed: {stats.get('failed', 0)}")
    print(f"Elapsed time: {stats.get('elapsed_seconds', 0):.2f} seconds")
    print("=" * 60)
    
    if stats.get('scraped', 0) == 0 and stats.get('failed', 0) > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()

