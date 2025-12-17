"""
HEB Product Scraper

Systematically scrapes all products from HEB's GraphQL API.

Strategy:
1. Discover categories/departments from HEB's website structure
2. Scrape products from each category with pagination
3. Use search queries as a fallback/discovery mechanism
4. Store all products in Supabase database
"""

import os
import sys
import time
import json
import logging
import random
import requests
from typing import Dict, List, Optional, Set, Any
from datetime import datetime
from pathlib import Path
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except ImportError:
    from requests.packages.urllib3.util.retry import Retry
from heb_graphql_client import HEBGraphQLClient, GraphQLResponse
from supabase_client import get_client, SupabaseService
from supabase_config import get_config
import hashlib

from core.base_scraper import BaseScraper

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HEBScraper(BaseScraper):
    """Systematically scrapes HEB products using GraphQL API."""
    
    def __init__(self, store_id: Optional[str] = None, cookies: Optional[str] = None, dry_run: bool = False, 
                 rate_limit_delay: float = 0.8, rate_limit_variance: float = 0.3, max_items: Optional[int] = None):
        """
        Initialize the scraper.
        
        Args:
            store_id: HEB store ID (optional, for store-specific data)
                     Can also be set via HEB_STORE_ID environment variable.
                     Example: store_id="202" for a specific store location.
                     To find your store ID, check the storeId field in search/product responses.
            cookies: Authentication cookies string (required for authenticated requests)
            dry_run: If True, skip Supabase storage and only log products (useful for testing)
            rate_limit_delay: Base delay between requests (seconds)
            rate_limit_variance: Random variance in delay (seconds)
            max_items: Maximum items to scrape (None = no limit)
        """
        # Initialize base scraper
        super().__init__(
            retailer_name='heb',
            store_id=store_id or os.getenv('HEB_STORE_ID'),
            dry_run=dry_run,
            rate_limit_delay=rate_limit_delay,
            rate_limit_variance=rate_limit_variance,
            max_items=max_items
        )
        
        # HEB-specific initialization
        self.client = HEBGraphQLClient()
        self.store_id = self.store_id  # Already set by BaseScraper
        
        # Set cookies if provided
        if cookies:
            # Store cookies string for header usage
            self._cookies = cookies
            
            # Parse cookies string and set them directly in the session
            from http.cookies import SimpleCookie
            cookie_jar = requests.cookies.RequestsCookieJar()
            
            # Parse the cookie string
            for cookie in cookies.split(';'):
                cookie = cookie.strip()
                if '=' in cookie:
                    key, value = cookie.split('=', 1)
                    cookie_jar.set(key.strip(), value.strip(), domain='.heb.com', path='/')
            
            self.client.session.cookies.update(cookie_jar)
            logger.debug(f"Set {len(cookie_jar)} cookies in session")
        else:
            self._cookies = None
        
        # Setup session with retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.client.session.mount("http://", adapter)
        self.client.session.mount("https://", adapter)
        
        # Supabase is initialized by BaseScraper, but we need to ensure it's available
        # BaseScraper already handles this, so we just log
        if self.store_id:
            logger.info(f"Initialized HEB scraper with store ID: {self.store_id}")
        else:
            logger.info("Initialized HEB scraper without store ID (products will be scraped without store-specific context)")
    
    def fetch_shop_navigation(self) -> Optional[Dict[str, Any]]:
        """
        Fetch shop navigation from HEB's GraphQL API.
        
        Returns:
            GraphQL response with shopNavigation data, or None if failed
        """
        try:
            # Establish session first if needed
            if not hasattr(self, '_session_established'):
                self._establish_session()
                self._session_established = True
            
            # GraphQL query for shopNavigation
            query = """
            query {
                shopNavigation {
                    id
                    href
                    shortDisplayName
                    displayName
                    needsDivider
                    subCategories {
                        href
                        displayName
                        shortDisplayName
                        __typename
                    }
                    __typename
                }
            }
            """
            
            # Use the GraphQL client to fetch navigation
            response = self.client.query(query, operation_name='shopNavigation')
            
            if response.success and response.data:
                return response.data
            else:
                logger.warning(f"Failed to fetch shopNavigation: {response.errors}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching shopNavigation: {e}", exc_info=True)
            return None
    
    def discover_categories(self) -> List[Dict[str, Any]]:
        """
        Discover product categories from HEB.
        
        Returns:
            List of category dictionaries with name, id, url, and parent fields.
            Categories are filtered to grocery-only in the base class.
        """
        """
        Discover product categories/departments from HEB.
        
        Fetches categories from GraphQL shopNavigation API and extracts all
        categories and subcategories with their URLs.
        
        Returns:
            List of category dictionaries with name, id, and url path
        """
        logger.info("Discovering product categories from GraphQL shopNavigation...")
        
        # Try to fetch from GraphQL API
        nav_data = self.fetch_shop_navigation()
        
        categories = []
        
        if nav_data and 'shopNavigation' in nav_data:
            shop_nav = nav_data['shopNavigation']
            
            for main_category in shop_nav:
                main_name = main_category.get('displayName', '')
                main_id = main_category.get('id', '')
                main_href = main_category.get('href', '')
                
                # Add main category if it has an href
                if main_href:
                    categories.append({
                        'name': main_name,
                        'id': main_id or main_name.lower().replace(' ', '-'),
                        'url': main_href,
                        'parent': None
                    })
                
                # Add all subcategories
                subcategories = main_category.get('subCategories', [])
                for subcat in subcategories:
                    sub_name = subcat.get('displayName', '')
                    sub_href = subcat.get('href', '')
                    
                    if sub_href:
                        categories.append({
                            'name': sub_name,
                            'id': sub_name.lower().replace(' ', '-').replace('&', 'and'),
                            'url': sub_href,
                            'parent': main_name
                        })
        
        # Fallback: Use hardcoded structure based on provided GraphQL response
        if not categories:
            logger.warning("GraphQL fetch failed, using fallback categories from provided structure")
            # This matches the structure the user provided
            fallback_nav = {
                "shopNavigation": [
                    {"id": "490020", "href": "/category/shop/fruit-vegetables/2863/490020", "displayName": "Fruit & vegetables", "subCategories": [
                        {"href": "/category/shop/fruit-vegetables/fruit/490020/490082", "displayName": "Fruit"},
                        {"href": "/category/shop/fruit-vegetables/vegetables/490020/490083", "displayName": "Vegetables"}
                    ]},
                    {"id": "490023", "href": "/category/shop/meat-seafood/2863/490023", "displayName": "Meat & seafood", "subCategories": [
                        {"href": "/category/shop/meat-seafood/meat/490023/490110", "displayName": "Meat"},
                        {"href": "/category/shop/meat-seafood/seafood/490023/490111", "displayName": "Seafood"},
                        {"href": "/category/shop/meat-seafood/tofu-meat-alternatives/490023/490112", "displayName": "Tofu & meat alternatives"}
                    ]},
                    {"id": "490014", "href": "/category/shop/bakery-bread/2863/490014", "displayName": "Bakery & bread", "subCategories": [
                        {"href": "/category/shop/bakery-bread/bread/490014/490027", "displayName": "Bread"},
                        {"href": "/category/shop/bakery-bread/breading-crumbs/490014/490028", "displayName": "Breading & crumbs"},
                        {"href": "/category/shop/bakery-bread/cookies/490014/490030", "displayName": "Cookies"},
                        {"href": "/category/shop/bakery-bread/desserts-pastries/490014/490031", "displayName": "Desserts & pastries"},
                        {"href": "/category/shop/bakery-bread/tortillas/490014/490032", "displayName": "Tortillas"},
                        {"href": "/category/shop/bakery-bread/cakes/490014/490029", "displayName": "Cakes"}
                    ]},
                    {"id": "490016", "href": "/category/shop/dairy-eggs/2863/490016", "displayName": "Dairy & eggs", "subCategories": [
                        {"href": "/category/shop/dairy-eggs/biscuit-cookie-dough/490016/490047", "displayName": "Biscuit & cookie dough"},
                        {"href": "/category/shop/dairy-eggs/butter-margarine/490016/490048", "displayName": "Butter & margarine"},
                        {"href": "/category/shop/dairy-eggs/cheese/490016/490049", "displayName": "Cheese"},
                        {"href": "/category/shop/dairy-eggs/cottage-cheese/490016/490050", "displayName": "Cottage cheese"},
                        {"href": "/category/shop/dairy-eggs/cream/490016/490051", "displayName": "Cream"},
                        {"href": "/category/shop/dairy-eggs/eggs-egg-substitutes/490016/490052", "displayName": "Eggs & egg substitutes"},
                        {"href": "/category/shop/dairy-eggs/milk/490016/490053", "displayName": "Milk"},
                        {"href": "/category/shop/dairy-eggs/pudding-gelatin/490016/490054", "displayName": "Pudding & gelatin"},
                        {"href": "/category/shop/dairy-eggs/sour-cream/490016/490055", "displayName": "Sour cream"},
                        {"href": "/category/shop/dairy-eggs/yogurt/490016/490056", "displayName": "Yogurt"}
                    ]},
                    {"id": "490017", "href": "/category/shop/deli-prepared-food/2863/490017", "displayName": "Deli & prepared food", "subCategories": [
                        {"href": "/category/shop/deli-prepared-food/cheese/490017/490057", "displayName": "Cheese"},
                        {"href": "/category/shop/deli-prepared-food/dip/490017/490058", "displayName": "Dip"},
                        {"href": "/category/shop/deli-prepared-food/meat/490017/490059", "displayName": "Meat"},
                        {"href": "/category/shop/deli-prepared-food/ready-meals-snacks/490017/490061", "displayName": "Ready meals & snacks"},
                        {"href": "/category/shop/deli-prepared-food/party-trays/490017/490060", "displayName": "Party trays"}
                    ]},
                    {"id": "490024", "href": "/category/shop/pantry/2863/490024", "displayName": "Pantry", "subCategories": [
                        {"href": "/category/shop/pantry/baking-ingredients/490024/490113", "displayName": "Baking ingredients"},
                        {"href": "/category/shop/pantry/broth-bouillon/490024/490114", "displayName": "Broth & bouillon"},
                        {"href": "/category/shop/pantry/canned-dried-food/490024/490115", "displayName": "Canned & dried food"},
                        {"href": "/category/shop/pantry/cereal-breakfast/490024/490116", "displayName": "Cereal & breakfast"},
                        {"href": "/category/shop/pantry/condiments/490024/490117", "displayName": "Condiments"},
                        {"href": "/category/shop/pantry/dressing-oil-vinegar/490024/490118", "displayName": "Dressing, oil & vinegar"},
                        {"href": "/category/shop/pantry/jelly-jam/490024/490119", "displayName": "Jelly & jam"},
                        {"href": "/category/shop/pantry/pantry-meals/490024/490120", "displayName": "Pantry meals"},
                        {"href": "/category/shop/pantry/pasta-rice/490024/490121", "displayName": "Pasta & rice"},
                        {"href": "/category/shop/pantry/peanut-butter/490024/490122", "displayName": "Peanut butter"},
                        {"href": "/category/shop/pantry/salsa-dip/490024/490123", "displayName": "Salsa & dip"},
                        {"href": "/category/shop/pantry/sauces-marinades/490024/490124", "displayName": "Sauces & marinades"},
                        {"href": "/category/shop/pantry/snacks-candy/490024/490125", "displayName": "Snacks & candy"},
                        {"href": "/category/shop/pantry/soups-chili/490024/490126", "displayName": "Soups & chili"},
                        {"href": "/category/shop/pantry/spices-seasonings/490024/490127", "displayName": "Spices & seasonings"},
                        {"href": "/category/shop/pantry/sugar-sweeteners/490024/490128", "displayName": "Sugar & sweeteners"}
                    ]},
                    {"id": "490019", "href": "/category/shop/frozen-food/2863/490019", "displayName": "Frozen food", "subCategories": [
                        {"href": "/category/shop/frozen-food/bread-baked-goods/490019/490073", "displayName": "Bread & baked goods"},
                        {"href": "/category/shop/frozen-food/fruit/490019/490074", "displayName": "Fruit"},
                        {"href": "/category/shop/frozen-food/ice-cream-treats/490019/490075", "displayName": "Ice cream & treats"},
                        {"href": "/category/shop/frozen-food/juice-smoothies/490019/490076", "displayName": "Juice & smoothies"},
                        {"href": "/category/shop/frozen-food/meals-sides/490019/490077", "displayName": "Meals & sides"},
                        {"href": "/category/shop/frozen-food/meat/490019/490078", "displayName": "Meat"},
                        {"href": "/category/shop/frozen-food/meat-alternatives/490019/490079", "displayName": "Meat alternatives"},
                        {"href": "/category/shop/frozen-food/seafood/490019/490080", "displayName": "Seafood"},
                        {"href": "/category/shop/frozen-food/vegetables/490019/490081", "displayName": "Vegetables"}
                    ]},
                    {"id": "490015", "href": "/category/shop/beverages/2863/490015", "displayName": "Beverages", "subCategories": [
                        {"href": "/category/shop/beverages/beer-wine/490015/490033", "displayName": "Beer & wine"},
                        {"href": "/category/shop/beverages/cocoa/490015/490034", "displayName": "Cocoa"},
                        {"href": "/category/shop/beverages/coconut-water/490015/490035", "displayName": "Coconut water"},
                        {"href": "/category/shop/beverages/coffee/490015/490036", "displayName": "Coffee"},
                        {"href": "/category/shop/beverages/coffee-creamer/490015/490037", "displayName": "Coffee creamer"},
                        {"href": "/category/shop/beverages/coffee-filters/490015/490038", "displayName": "Coffee filters"},
                        {"href": "/category/shop/beverages/ice/490015/490039", "displayName": "Ice"},
                        {"href": "/category/shop/beverages/juice/490015/490040", "displayName": "Juice"},
                        {"href": "/category/shop/beverages/mixes-flavor-enhancers/490015/490041", "displayName": "Mixes & flavor enhancers"},
                        {"href": "/category/shop/beverages/shakes-smoothies/490015/490042", "displayName": "Shakes & smoothies"},
                        {"href": "/category/shop/beverages/soda/490015/490043", "displayName": "Soda"},
                        {"href": "/category/shop/beverages/sports-energy-drinks/490015/490044", "displayName": "Sports & energy drinks"},
                        {"href": "/category/shop/beverages/tea/490015/490045", "displayName": "Tea"},
                        {"href": "/category/shop/beverages/water/490015/490046", "displayName": "Water"}
                    ]},
                    {"id": "490018", "href": "/category/shop/everyday-essentials/2863/490018", "displayName": "Everyday essentials", "subCategories": [
                        {"href": "/category/shop/everyday-essentials/air-fresheners-candles/490018/490062", "displayName": "Air fresheners & candles"},
                        {"href": "/category/shop/everyday-essentials/batteries/490018/490063", "displayName": "Batteries"},
                        {"href": "/category/shop/everyday-essentials/cleaners/490018/490064", "displayName": "Cleaners"},
                        {"href": "/category/shop/everyday-essentials/cleaning-tools/490018/490065", "displayName": "Cleaning tools"},
                        {"href": "/category/shop/everyday-essentials/disposable-kitchenware/490018/490066", "displayName": "Disposable kitchenware"},
                        {"href": "/category/shop/everyday-essentials/facial-tissue/490018/490067", "displayName": "Facial tissue"},
                        {"href": "/category/shop/everyday-essentials/food-storage-wraps/490018/490068", "displayName": "Food storage & wraps"},
                        {"href": "/category/shop/everyday-essentials/laundry/490018/490069", "displayName": "Laundry"},
                        {"href": "/category/shop/everyday-essentials/paper-towels/490018/490070", "displayName": "Paper towels"},
                        {"href": "/category/shop/everyday-essentials/toilet-paper/490018/490071", "displayName": "Toilet paper"},
                        {"href": "/category/shop/everyday-essentials/trash-bags/490018/490072", "displayName": "Trash bags"}
                    ]},
                    {"id": "490021", "href": "/category/shop/health-beauty/2863/490021", "displayName": "Health & beauty", "subCategories": [
                        {"href": "/category/shop/health-beauty/bath-skin-care/490021/490084", "displayName": "Bath & skin care"},
                        {"href": "/category/shop/health-beauty/hair-care/490021/490090", "displayName": "Hair care"},
                        {"href": "/category/shop/health-beauty/makeup/490021/490093", "displayName": "Makeup"},
                        {"href": "/category/shop/health-beauty/nails/490021/490095", "displayName": "Nails"},
                        {"href": "/category/shop/health-beauty/cotton-balls-swabs/490021/490085", "displayName": "Cotton balls & swabs"},
                        {"href": "/category/shop/health-beauty/diet-fitness/490021/490086", "displayName": "Diet & fitness"},
                        {"href": "/category/shop/health-beauty/eye-ear-care/490021/490087", "displayName": "Eye & ear care"},
                        {"href": "/category/shop/health-beauty/feminine-care/490021/490088", "displayName": "Feminine care"},
                        {"href": "/category/shop/health-beauty/foot-care/490021/490089", "displayName": "Foot care"},
                        {"href": "/category/shop/health-beauty/home-health-care/490021/490091", "displayName": "Home health care"},
                        {"href": "/category/shop/health-beauty/incontinence/490021/490092", "displayName": "Incontinence"},
                        {"href": "/category/shop/health-beauty/medicines-treatments/490021/490094", "displayName": "Medicines & treatments"},
                        {"href": "/category/shop/health-beauty/oral-hygiene/490021/490096", "displayName": "Oral hygiene"},
                        {"href": "/category/shop/health-beauty/sexual-wellness/490021/490097", "displayName": "Sexual wellness"},
                        {"href": "/category/shop/health-beauty/vitamins-supplements/490021/490098", "displayName": "Vitamins & supplements"}
                    ]},
                    {"id": "490022", "href": "/category/shop/home-outdoor/2863/490022", "displayName": "Home & outdoor", "subCategories": [
                        {"href": "/category/shop/home-outdoor/bedding-bath/490022/490099", "displayName": "Bedding & bath"},
                        {"href": "/category/shop/home-outdoor/clothes-shoes/490022/490100", "displayName": "Clothes & shoes"},
                        {"href": "/category/shop/home-outdoor/seasonal-decor/490022/490101", "displayName": "Seasonal decor"},
                        {"href": "/category/shop/home-outdoor/electronics/490022/490102", "displayName": "Electronics"},
                        {"href": "/category/shop/home-outdoor/home-improvement/490022/490104", "displayName": "Home improvement"},
                        {"href": "/category/shop/home-outdoor/kitchen-dining/490022/490105", "displayName": "Kitchen & dining"},
                        {"href": "/category/shop/home-outdoor/patio-outdoor/490022/490106", "displayName": "Patio & outdoor"},
                        {"href": "/category/shop/home-outdoor/pest-control/490022/490107", "displayName": "Pest control"},
                        {"href": "/category/shop/home-outdoor/school-office-supplies/490022/490108", "displayName": "School & office supplies"},
                        {"href": "/category/shop/home-outdoor/storage-organization/490022/490109", "displayName": "Storage & organization"},
                        {"href": "/category/shop/home-outdoor/flowers-gift-baskets/490022/490103", "displayName": "Flowers & gift baskets"}
                    ]},
                    {"id": "489924", "href": "/category/shop/baby-kids/2863/489924", "displayName": "Baby & kids", "subCategories": [
                        {"href": "/category/shop/baby-kids/food-formula/489924/489934", "displayName": "Food & formula"},
                        {"href": "/category/shop/baby-kids/diapers-potty/489924/489932", "displayName": "Diapers & potty"},
                        {"href": "/category/shop/baby-kids/health-skin-care/489924/489935", "displayName": "Health & skin care"},
                        {"href": "/category/shop/baby-kids/toys/489924/489937", "displayName": "Toys"},
                        {"href": "/category/shop/baby-kids/feeding/489924/489933", "displayName": "Feeding"},
                        {"href": "/category/shop/baby-kids/baby-safety/489924/489929", "displayName": "Baby safety"},
                        {"href": "/category/shop/baby-kids/bath-tubs-accessories/489924/489930", "displayName": "Bath tubs & accessories"},
                        {"href": "/category/shop/baby-kids/nursery-kids-room/489924/489936", "displayName": "Nursery & kids' room"},
                        {"href": "/category/shop/baby-kids/clothes/489924/489931", "displayName": "Clothes"},
                        {"href": "/category/shop/baby-kids/travel-equipment/489924/489938", "displayName": "Travel equipment"}
                    ]},
                    {"id": "490025", "href": "/category/shop/pets/2863/490025", "displayName": "Pets", "subCategories": [
                        {"href": "/category/shop/pets/dogs/490025/490131", "displayName": "Dogs"},
                        {"href": "/category/shop/pets/cats/490025/490130", "displayName": "Cats"},
                        {"href": "/category/shop/pets/birds/490025/490129", "displayName": "Birds"},
                        {"href": "/category/shop/pets/fish/490025/490132", "displayName": "Fish"},
                        {"href": "/category/shop/pets/small-animals/490025/490134", "displayName": "Small animals"},
                        {"href": "/category/shop/pets/reptiles/490025/490133", "displayName": "Reptiles"}
                    ]},
                    {"id": "1157212", "href": "/category/shop/donations/2863/1157212", "displayName": "Donations", "subCategories": [
                        {"href": "/category/shop/donations/donations/1157212/1162483", "displayName": "Donations"}
                    ]}
                ]
            }
            nav_data = fallback_nav
        
        # Parse the navigation structure
        # Only use subcategories, as main category URLs may not be valid endpoints
        if nav_data and 'shopNavigation' in nav_data:
            shop_nav = nav_data['shopNavigation']
            
            for main_category in shop_nav:
                main_name = main_category.get('displayName', '')
                main_id = main_category.get('id', '')
                
                # Only add subcategories (main category URLs often return 404)
                subcategories = main_category.get('subCategories', [])
                for subcat in subcategories:
                    sub_name = subcat.get('displayName', '')
                    sub_href = subcat.get('href', '')
                    
                    if sub_href:
                        categories.append({
                            'name': sub_name,
                            'id': sub_name.lower().replace(' ', '-').replace('&', 'and'),
                            'url': sub_href,
                            'parent': main_name
                        })
        
        logger.info(f"Found {len(categories)} categories with URLs to scrape")
        return categories
    
    def get_nextjs_build_id(self) -> str:
        """
        Get the Next.js build ID from HEB's website.
        This is required for the /_next/data/ endpoints.
        
        Returns:
            Build ID string (e.g., "374808b5f80b6be9f6b7e527bb6bf21cbc44e0b2")
        """
        # Try to get build ID from the search page HTML
        try:
            headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
            response = self.client.session.get('https://www.heb.com/search?q=milk', headers=headers, timeout=10)
            if response.status_code == 200:
                # Look for buildId in the page HTML
                # Next.js typically includes it in __NEXT_DATA__ script tag or in links
                import re
                # Try to find it in __NEXT_DATA__ script tag
                match = re.search(r'/_next/data/([a-f0-9]{40})/', response.text)
                if match:
                    build_id = match.group(1)
                    logger.debug(f"Discovered build ID: {build_id}")
                    return build_id
                
                # Also check for shorter build IDs
                match = re.search(r'/_next/data/([a-zA-Z0-9_-]{20,})/', response.text)
                if match:
                    build_id = match.group(1)
                    logger.debug(f"Discovered build ID (short): {build_id}")
                    return build_id
        except Exception as e:
            logger.debug(f"Could not discover build ID from page: {e}")
        
        # Fallback: Use a recent build ID (may need updating)
        # The build ID changes when Next.js rebuilds the site
        # From user's discovery: 374808b5f80b6be9f6b7e527bb6bf21cbc44e0b2
        logger.info("Using fallback build ID - may need updating if it changes")
        return "374808b5f80b6be9f6b7e527bb6bf21cbc44e0b2"
    
    def _get_random_delay(self) -> float:
        """Get a random delay with variance to avoid detection."""
        if self.rate_limit_delay <= 0:
            return 0
        
        variance = random.uniform(-self.rate_limit_variance, self.rate_limit_variance)
        delay = max(0.5, self.rate_limit_delay + variance)  # Minimum 0.5 seconds
        return delay
    
    def _establish_session(self):
        """
        Visit the main page first to establish a session and pass bot protection.
        This helps ensure cookies and headers are properly set.
        Uses a more realistic browsing pattern.
        """
        try:
            logger.debug("Establishing session with HEB...")
            
            # Step 1: Visit main page
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
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            }
            
            # Add cookies to headers if available
            if self._cookies:
                headers['Cookie'] = self._cookies
            
            # Visit main page
            response = self.client.session.get('https://www.heb.com/', headers=headers, timeout=15, allow_redirects=True)
            response.raise_for_status()
            
            # Small delay to simulate reading the page
            time.sleep(random.uniform(1.0, 2.0))
            
            # Step 2: Visit search page to establish search context
            headers['Referer'] = 'https://www.heb.com/'
            headers['Sec-Fetch-Site'] = 'same-origin'
            headers['Sec-Fetch-Mode'] = 'navigate'
            headers['Sec-Fetch-Dest'] = 'document'
            
            response = self.client.session.get('https://www.heb.com/search', headers=headers, timeout=15, allow_redirects=True)
            response.raise_for_status()
            
            logger.debug("Session established successfully")
            
        except Exception as e:
            logger.warning(f"Session establishment failed (continuing anyway): {e}")
    
    def get_category_products_from_html(self, category_url: str, page: int = 1):
        """
        Get products from a category URL by scraping the HTML page.
        This is more reliable than trying to use Next.js data endpoints.
        
        Category URL format: /category/shop/{path}/{id1}/{id2}
        
        Args:
            category_url: Category URL path (e.g., "/category/shop/meat-seafood/meat/490023/490110")
            page: Page number (1-indexed)
            
        Returns:
            Dict with product results
        """
        try:
            # Establish session first if needed
            if not hasattr(self, '_session_established'):
                self._establish_session()
                self._session_established = True
            
            # Add small random delay before request
            pre_delay = random.uniform(0.2, 0.5)
            time.sleep(pre_delay)
            
            # Build full category URL with pagination
            if category_url.startswith('/'):
                base_url = f"https://www.heb.com{category_url}"
            else:
                base_url = f"https://www.heb.com/{category_url}"
            
            # Add page parameter if not page 1
            if page > 1:
                # Check if URL already has query params
                separator = '&' if '?' in base_url else '?'
                full_url = f"{base_url}{separator}page={page}"
            else:
                full_url = base_url
            
            # Visit the HTML page
            headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.6',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            }
            if self._cookies:
                headers['Cookie'] = self._cookies
            
            logger.debug(f"Visiting category page: {full_url}")
            page_response = self.client.session.get(full_url, headers=headers, timeout=15)
            
            # Handle rate limiting
            if page_response.status_code == 429:
                wait_time = self.rate_limit_delay * 5 + random.uniform(2, 5)
                logger.warning(f"Rate limited (429). Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
                self._establish_session()
                page_response = self.client.session.get(full_url, headers=headers, timeout=15)
            
            if page_response.status_code != 200:
                error_msg = f"{page_response.status_code} {page_response.reason}"
                logger.warning(f"Category page request failed: {error_msg}")
                return {
                    'data': None,
                    'errors': [{'message': error_msg, 'status_code': page_response.status_code}],
                    'success': False
                }
            
            import re
            html = page_response.text
            
            # Extract products from __NEXT_DATA__ script tag
            next_data_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
            if not next_data_match:
                logger.warning("Could not find __NEXT_DATA__ script tag in HTML")
                return {
                    'data': None,
                    'errors': [{'message': 'Could not find __NEXT_DATA__ in HTML'}],
                    'success': False
                }
            
            try:
                next_data = json.loads(next_data_match.group(1))
                page_props = next_data.get('props', {}).get('pageProps', {})
                layout = page_props.get('layout', {})
                visual_components = layout.get('visualComponents', [])
                
                # Find products in the page
                products = []
                pagination_info = {}
                for component in visual_components:
                    if component.get('__typename') in ['SearchGridV2', 'ProductGrid']:
                        items = component.get('items', [])
                        products = [item for item in items if item.get('__typename') == 'Product']
                        
                        total = component.get('total', 0)
                        page_size = component.get('pageSize', 50)
                        current_page = component.get('page', page)
                        total_pages = component.get('totalPages', (total + page_size - 1) // page_size if total > 0 else 0)
                        has_more = component.get('hasMore', False)
                        
                        pagination_info = {
                            'totalCount': total,
                            'page': current_page - 1,
                            'pageSize': page_size,
                            'hasMore': has_more if has_more else (len(products) >= page_size and current_page < total_pages),
                            'totalPages': total_pages if total_pages > 0 else ((total + page_size - 1) // page_size if total > 0 else 0)
                        }
                        break
                
                logger.debug(f"Extracted {len(products)} products from page {page}")
                return {
                    'data': {
                        'searchProducts': {
                            'products': products,
                            'pagination': pagination_info
                        }
                    },
                    'errors': None,
                    'success': True
                }
            except json.JSONDecodeError as e:
                logger.error(f"Could not parse __NEXT_DATA__ JSON: {e}")
                return {
                    'data': None,
                    'errors': [{'message': f'JSON parse error: {e}'}],
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"Error scraping category HTML: {e}", exc_info=True)
            return {
                'data': None,
                'errors': [{'message': str(e)}],
                'success': False
            }
    
    def get_products_from_category_api(self, category_url: str, page: int = 1, sct: Optional[str] = None) -> Dict[str, Any]:
        """
        Get products from a category using HEB's direct category API endpoint.
        
        This uses the endpoint discovered by the user:
        /_next/data/{buildId}/category/shop/{parentId}/{childId}.json?sct=...&parentId={parentId}&childId={childId}
        
        Args:
            category_url: Category URL path (e.g., "/category/shop/meat-seafood/meat/490023/490110")
            page: Page number (1-indexed)
            sct: Optional sct parameter from previous page (for pagination)
            
        Returns:
            Dict with product results, pagination info, and success status.
        """
        logger.info(f"Fetching products from category API for {category_url}, page {page}")
        try:
            # Establish session first if needed
            if not hasattr(self, '_session_established'):
                self._establish_session()
                self._session_established = True
            
            # Extract parentId and childId from category URL
            # Format: /category/shop/{path}/{parentId}/{childId}
            import re
            match = re.match(r'/category/shop/(?:[^/]+/)*?(\d+)/(\d+)', category_url)
            if not match:
                logger.error(f"Could not extract parentId and childId from category URL: {category_url}")
                return {'data': None, 'errors': [{'message': 'Invalid category URL format'}], 'success': False}
            
            parent_id = match.group(1)
            child_id = match.group(2)
            
            # Get build ID (try to discover from category page first, then fallback)
            build_id = self.get_nextjs_build_id()
            
            # For page 1, try to get build_id and sct from HTML if not provided
            if page == 1 and not sct:
                try:
                    full_url = f"https://www.heb.com{category_url}"
                    headers = {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.6',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                    }
                    if self._cookies:
                        headers['Cookie'] = self._cookies
                    
                    page_response = self.client.session.get(full_url, headers=headers, timeout=15)
                    if page_response.status_code == 200:
                        html = page_response.text
                        
                        # Extract build ID
                        build_match = re.search(r'/_next/data/([a-f0-9]{40})/', html)
                        if build_match:
                            build_id = build_match.group(1)
                            logger.debug(f"Discovered build ID from category page: {build_id}")
                        
                        # Extract sct parameter from page 2 links
                        sct_match = re.search(r'page=2[^"]*sct=([^"&]+)', html)
                        if sct_match:
                            sct = sct_match.group(1)
                            logger.debug(f"Extracted sct parameter: {sct[:20]}...")
                except Exception as e:
                    logger.debug(f"Could not extract build_id/sct from HTML: {e}")
            
            # Construct the API URL
            # Example: https://www.heb.com/_next/data/{buildId}/category/shop/{parentId}/{childId}.json
            api_path = f"/_next/data/{build_id}/category/shop/{parent_id}/{child_id}.json"
            params = {
                'parentId': parent_id,
                'childId': child_id
            }
            if sct:
                params['sct'] = sct
            if page > 1:
                params['page'] = page
            
            full_api_url = f"https://www.heb.com{api_path}"
            
            # Set headers to match the user's provided request
            headers = {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.6',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Referer': f"https://www.heb.com{category_url}",
                'Sec-CH-UA': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-GPC': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'X-Nextjs-Data': '1',
                'Priority': 'u=1, i',
            }
            if self._cookies:
                headers['Cookie'] = self._cookies
            
            # Add random delay before request
            time.sleep(self._get_random_delay())
            
            logger.debug(f"Requesting category API: {full_api_url} with params: {params}")
            response = self.client.session.get(full_api_url, headers=headers, params=params, timeout=15)
            
            # Handle rate limiting
            if response.status_code == 429:
                wait_time = self.rate_limit_delay * 5 + random.uniform(2, 5)
                logger.warning(f"Rate limited (429). Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
                self._establish_session()
                response = self.client.session.get(full_api_url, headers=headers, params=params, timeout=15)
            
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                try:
                    error_data = response.text[:500]
                    if error_data:
                        error_msg += f": {error_data}"
                except:
                    pass
                logger.warning(f"Category API request failed: {error_msg}")
                return {
                    'data': None,
                    'errors': [{'message': error_msg, 'status_code': response.status_code}],
                    'success': False
                }
            
            json_data = response.json()
            
            # Extract products and pagination info from the JSON response
            products = []
            pagination_info = {
                'totalCount': 0,
                'page': page - 1,  # Convert to 0-indexed for internal use
                'pageSize': 50,
                'hasMore': False,
                'totalPages': 0
            }
            
            # Parse the response structure: pageProps.layout.visualComponents
            if json_data and 'pageProps' in json_data:
                page_props = json_data['pageProps']
                layout = page_props.get('layout', {})
                visual_components = layout.get('visualComponents', [])
                
                for component in visual_components:
                    if component.get('type') == 'searchGridV2' and 'items' in component:
                        products.extend(component['items'])
                        total = component.get('total', 0)
                        page_size = len(component['items']) if len(component['items']) > 0 else 50
                        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
                        
                        # Extract sct for next page from _head.next URL if available
                        next_sct = None
                        if 'pageProps' in json_data and '_head' in json_data['pageProps']:
                            next_page_url = json_data['pageProps']['_head'].get('next')
                            if next_page_url:
                                sct_match = re.search(r'sct=([^&]+)', next_page_url)
                                if sct_match:
                                    next_sct = sct_match.group(1)
                        
                        pagination_info = {
                            'totalCount': total,
                            'page': page - 1,
                            'pageSize': page_size,
                            'hasMore': page < total_pages,
                            'totalPages': total_pages,
                            'next_sct': next_sct  # Store sct for next page
                        }
                        break
                
                logger.debug(f"Extracted {len(products)} products from category API page {page}")
                return {
                    'data': {
                        'searchProducts': {
                            'products': products,
                            'pagination': pagination_info
                        }
                    },
                    'errors': None,
                    'success': True
                }
            else:
                logger.warning(f"Unexpected JSON structure for category API: {json_data}")
                return {
                    'data': None,
                    'errors': [{'message': 'Unexpected JSON structure'}],
                    'success': False
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP request failed for category API: {e}")
            return {
                'data': None,
                'errors': [{'message': f'HTTP request failed: {e}'}],
                'success': False
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for category API response: {e}")
            return {
                'data': None,
                'errors': [{'message': f'JSON decode error: {e}'}],
                'success': False
            }
        except Exception as e:
            logger.error(f"An unexpected error occurred while fetching from category API: {e}", exc_info=True)
            return {
                'data': None,
                'errors': [{'message': str(e)}],
                'success': False
            }
    
    def get_category_products_from_url(self, category_url: str, page: int = 1, sct: Optional[str] = None):
        """
        Get products from a category URL - prioritizes direct API, falls back to HTML scraping.
        
        Args:
            category_url: Category URL path
            page: Page number (1-indexed)
            sct: Optional sct parameter for pagination
            
        Returns:
            Dict with product results
        """
        # Try direct API endpoint first (most reliable)
        response = self.get_products_from_category_api(category_url, page, sct)
        if response.get('success'):
            return response
        
        # Fall back to HTML scraping if API fails
        logger.debug(f"Category API failed, falling back to HTML scraping for {category_url}")
        return self.get_category_products_from_html(category_url, page)
    
    def get_category_products_from_url_old(self, category_url: str, page: int = 1, sct: Optional[str] = None):
        """
        OLD METHOD - Get products from a category URL using HEB's Next.js data endpoint.
        Kept for reference but HTML scraping is preferred.
        
        Category URL format: /category/shop/{path}/{id1}/{id2}
        Next.js data endpoint: /_next/data/{buildId}/category/shop/{path}/{id1}/{id2}.json
        
        Args:
            category_url: Category URL path (e.g., "/category/shop/meat-seafood/meat/490023/490110")
            page: Page number (1-indexed)
            sct: Optional sct parameter from previous page (for pagination)
            
        Returns:
            Dict with product results
        """
        try:
            # Establish session first if needed
            if not hasattr(self, '_session_established'):
                self._establish_session()
                self._session_established = True
            
            # Add small random delay before request
            pre_delay = random.uniform(0.2, 0.5)
            time.sleep(pre_delay)
            
            # Build full category URL
            if category_url.startswith('/'):
                full_url = f"https://www.heb.com{category_url}"
            else:
                full_url = f"https://www.heb.com/{category_url}"
            
            # For page 1, visit the actual HTML page to get build ID and initial data
            if page == 1:
                try:
                    headers = {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.6',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                    }
                    if self._cookies:
                        headers['Cookie'] = self._cookies
                    
                    page_response = self.client.session.get(full_url, headers=headers, timeout=15)
                    if page_response.status_code == 200:
                        import re
                        html = page_response.text
                        
                        # Extract build ID
                        match = re.search(r'/_next/data/([a-f0-9]{40})/', html)
                        if match:
                            build_id = match.group(1)
                            logger.debug(f"Discovered build ID from category page: {build_id}")
                        else:
                            # Try shorter build ID format
                            match = re.search(r'/_next/data/([a-zA-Z0-9_-]{20,})/', html)
                            if match:
                                build_id = match.group(1)
                                logger.debug(f"Discovered build ID (short format): {build_id}")
                            else:
                                build_id = self.get_nextjs_build_id()
                        
                        # Try to extract sct parameter from page 2 links in HTML
                        if not sct:
                            sct_match = re.search(r'page=2[^"]*sct=([^"&]+)', html)
                            if sct_match:
                                sct = sct_match.group(1)
                                logger.debug(f"Extracted sct parameter: {sct[:20]}...")
                        
                        # Also try to get data from __NEXT_DATA__ script tag
                        next_data_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
                        if next_data_match:
                            try:
                                next_data = json.loads(next_data_match.group(1))
                                page_props = next_data.get('props', {}).get('pageProps', {})
                                layout = page_props.get('layout', {})
                                visual_components = layout.get('visualComponents', [])
                                
                                # Find products in the initial page load
                                products = []
                                pagination_info = {}
                                for component in visual_components:
                                    if component.get('__typename') in ['SearchGridV2', 'ProductGrid']:
                                        items = component.get('items', [])
                                        products = [item for item in items if item.get('__typename') == 'Product']
                                        
                                        total = component.get('total', 0)
                                        page_size = component.get('pageSize', 50)
                                        current_page = component.get('page', 1)
                                        total_pages = component.get('totalPages', (total + page_size - 1) // page_size if total > 0 else 0)
                                        has_more = component.get('hasMore', False)
                                        
                                        pagination_info = {
                                            'totalCount': total,
                                            'page': current_page - 1,
                                            'pageSize': page_size,
                                            'hasMore': has_more if has_more else (len(products) >= page_size and current_page < total_pages),
                                            'totalPages': total_pages if total_pages > 0 else ((total + page_size - 1) // page_size if total > 0 else 0)
                                        }
                                        break
                                
                                # Store build_id and sct for future pages
                                if not hasattr(self, '_category_build_ids'):
                                    self._category_build_ids = {}
                                self._category_build_ids[category_url] = build_id
                                
                                if sct and not hasattr(self, '_category_sct_params'):
                                    self._category_sct_params = {}
                                if sct:
                                    self._category_sct_params[category_url] = sct
                                
                                # Store build_id and sct for future pages
                                if not hasattr(self, '_category_build_ids'):
                                    self._category_build_ids = {}
                                self._category_build_ids[category_url] = build_id
                                
                                if sct and not hasattr(self, '_category_sct_params'):
                                    self._category_sct_params = {}
                                if sct:
                                    self._category_sct_params[category_url] = sct
                                
                                logger.info(f"  Extracted {len(products)} products from page 1 HTML")
                                return {
                                    'data': {
                                        'searchProducts': {
                                            'products': products,
                                            'pagination': pagination_info
                                        }
                                    },
                                    'errors': None,
                                    'success': True
                                }
                            except json.JSONDecodeError as e:
                                logger.debug(f"Could not parse __NEXT_DATA__: {e}")
                        else:
                            logger.debug("Could not find __NEXT_DATA__ script tag in HTML")
                    else:
                        logger.warning(f"Category page returned {page_response.status_code}, falling back to data endpoint")
                        build_id = self.get_nextjs_build_id()
                except Exception as e:
                    logger.warning(f"Error getting initial category page: {e}, falling back to data endpoint")
                    build_id = self.get_nextjs_build_id()
            else:
                # For subsequent pages, use cached build ID or discover it
                if hasattr(self, '_category_build_ids') and category_url in self._category_build_ids:
                    build_id = self._category_build_ids[category_url]
                else:
                    build_id = self.get_nextjs_build_id()
                
                # Get sct parameter if we have it cached
                if not sct and hasattr(self, '_category_sct_params') and category_url in self._category_sct_params:
                    sct = self._category_sct_params[category_url]
            
            # If we got here, we need to use the data endpoint (either page 1 failed or page > 1)
            # But first, make sure we have a build_id
            if 'build_id' not in locals():
                build_id = self.get_nextjs_build_id()
            else:
                # For subsequent pages, use cached build ID or discover it
                if hasattr(self, '_category_build_ids') and category_url in self._category_build_ids:
                    build_id = self._category_build_ids[category_url]
                else:
                    build_id = self.get_nextjs_build_id()
                
                # Get sct parameter if we have it cached
                if not sct and hasattr(self, '_category_sct_params') and category_url in self._category_sct_params:
                    sct = self._category_sct_params[category_url]
            
            # Convert category URL to Next.js data endpoint
            if category_url.startswith('/category/'):
                data_path = category_url.lstrip('/')
            elif category_url.startswith('category/'):
                data_path = category_url
            else:
                data_path = f'category/{category_url}'
            
            url = f"https://www.heb.com/_next/data/{build_id}/{data_path}.json"
            
            params = {}
            if page > 1:
                params['page'] = page
            if sct:
                params['sct'] = sct
            if self.store_id:
                params['storeId'] = self.store_id
            
            # Set headers to match browser request
            headers = {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.6',
                'Cache-Control': 'no-cache',
                'DNT': '1',
                'Pragma': 'no-cache',
                'Referer': f'https://www.heb.com{data_path}',
                'Sec-CH-UA': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-GPC': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'x-nextjs-data': '1',
            }
            
            if self._cookies:
                headers['Cookie'] = self._cookies
            
            logger.debug(f"Requesting category URL: {url} with params: {params}")
            response = self.client.session.get(url, params=params, headers=headers, timeout=15)
            
            # Handle rate limiting
            if response.status_code == 429:
                wait_time = self.rate_limit_delay * 5 + random.uniform(2, 5)
                logger.warning(f"Rate limited (429). Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
                self._establish_session()
                response = self.client.session.get(url, params=params, headers=headers, timeout=15)
            
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                try:
                    error_data = response.text[:500]
                    if error_data:
                        error_msg += f": {error_data}"
                except:
                    pass
                logger.warning(f"Category request failed: {error_msg}")
                return {
                    'data': None,
                    'errors': [{'message': error_msg, 'status_code': response.status_code}],
                    'success': False
                }
            
            data = response.json()
            
            # Extract products from Next.js pageProps structure (similar to search)
            page_props = data.get('pageProps', {})
            layout = page_props.get('layout', {})
            visual_components = layout.get('visualComponents', [])
            
            products = []
            pagination_info = {}
            
            # Find the searchGridV2 or similar component
            for component in visual_components:
                if component.get('__typename') in ['SearchGridV2', 'ProductGrid']:
                    items = component.get('items', [])
                    products = [item for item in items if item.get('__typename') == 'Product']
                    
                    # Extract pagination info
                    total = component.get('total', 0)
                    page_size = component.get('pageSize', 50)
                    current_page = component.get('page', page)
                    total_pages = component.get('totalPages', (total + page_size - 1) // page_size if total > 0 else 0)
                    has_more = component.get('hasMore', False)
                    
                    pagination_info = {
                        'totalCount': total,
                        'page': current_page - 1,  # Convert to 0-indexed
                        'pageSize': page_size,
                        'hasMore': has_more if has_more else (len(products) >= page_size and current_page < total_pages),
                        'totalPages': total_pages if total_pages > 0 else ((total + page_size - 1) // page_size if total > 0 else 0)
                    }
                    break
            
            return {
                'data': {
                    'searchProducts': {
                        'products': products,
                        'pagination': pagination_info
                    }
                },
                'errors': None,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error fetching category products: {e}", exc_info=True)
            return {
                'data': None,
                'errors': [{'message': str(e)}],
                'success': False
            }
    
    def search_products(self, query: str, page: int = 0, page_size: int = 50):
        """
        Search for products using HEB's Next.js data endpoint.
        
        Discovered endpoint: /_next/data/{buildId}/search.json?q={query}
        
        Args:
            query: Search query string
            page: Page number (0-indexed) - Note: pagination may work differently
            page_size: Number of results per page - may be ignored
            
        Returns:
            Dict with search results (structured like GraphQLResponse for compatibility)
        """
        try:
            # Establish session first if needed (only once per scraper instance)
            if not hasattr(self, '_session_established'):
                self._establish_session()
                self._session_established = True
            
            # Add small random delay before request to avoid patterns
            pre_delay = random.uniform(0.2, 0.5)
            time.sleep(pre_delay)
            
            build_id = self.get_nextjs_build_id()
            url = f"https://www.heb.com/_next/data/{build_id}/search.json"
            
            params = {'q': query}
            if self.store_id:
                params['storeId'] = self.store_id
            
            # Add pagination parameters - HEB uses page parameter (1-indexed)
            if page > 0:
                params['page'] = page + 1  # Convert 0-indexed to 1-indexed
            
            # Set headers to match browser request exactly
            headers = {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.6',
                'Cache-Control': 'no-cache',
                'DNT': '1',
                'Pragma': 'no-cache',
                'Priority': 'u=1, i',
                'Referer': 'https://www.heb.com/search',  # More realistic referer
                'Sec-CH-UA': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-GPC': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'x-nextjs-data': '1',  # Important header for Next.js data endpoints
            }
            
            # Add cookies directly to headers if we have them (needed for Incapsula)
            if self._cookies:
                headers['Cookie'] = self._cookies
            
            logger.debug(f"Requesting URL: {url} with params: {params}")
            response = self.client.session.get(url, params=params, headers=headers, timeout=15)
            
            # Handle rate limiting
            if response.status_code == 429:
                wait_time = self.rate_limit_delay * 5 + random.uniform(2, 5)
                logger.warning(f"Rate limited (429). Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
                # Re-establish session after rate limit
                self._establish_session()
                # Retry once
                response = self.client.session.get(url, params=params, headers=headers, timeout=15)
            
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                # Try to get more details from response
                try:
                    error_data = response.text[:500]  # First 500 chars
                    if error_data:
                        error_msg += f": {error_data}"
                except:
                    pass
                logger.warning(f"Request failed: {error_msg}")
                return {
                    'data': None,
                    'errors': [{'message': error_msg, 'status_code': response.status_code}],
                    'success': False
                }
            
            data = response.json()
            
            # Extract products from Next.js pageProps structure
            page_props = data.get('pageProps', {})
            layout = page_props.get('layout', {})
            visual_components = layout.get('visualComponents', [])
            
            products = []
            pagination_info = {}
            
            # Find the searchGridV2 component which contains products
            for component in visual_components:
                if component.get('__typename') == 'SearchGridV2':
                    items = component.get('items', [])
                    
                    # Filter out SponsoredBanner items, only get Product items
                    products = [item for item in items if item.get('__typename') == 'Product']
                    
                    # Extract pagination/total info
                    total = component.get('total', 0)
                    page_size = component.get('pageSize', 50)
                    current_page = component.get('page', page + 1)  # HEB uses 1-indexed pages
                    total_pages = component.get('totalPages', (total + page_size - 1) // page_size if total > 0 else 0)
                    has_more = component.get('hasMore', False)
                    
                    pagination_info = {
                        'totalCount': total,
                        'page': current_page - 1,  # Convert back to 0-indexed for our use
                        'pageSize': page_size,
                        'hasMore': has_more if has_more else (len(products) >= page_size and current_page < total_pages),
                        'totalPages': total_pages if total_pages > 0 else ((total + page_size - 1) // page_size if total > 0 else 0)
                    }
                    break
            
            return {
                'data': {
                    'searchProducts': {
                        'products': products,
                        'pagination': pagination_info
                    }
                },
                'errors': None,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return {
                'data': None,
                'errors': [{'message': str(e)}],
                'success': False
            }
    
    def get_category_products(self, category_id: str, page: int = 0, page_size: int = 50) -> GraphQLResponse:
        """
        Get products from a specific category.
        
        Args:
            category_id: Category ID
            page: Page number (0-indexed)
            page_size: Number of results per page
            
        Returns:
            GraphQLResponse with category products
        """
        # Template query - needs to be discovered
        category_query = """
        query GetCategoryProducts($categoryId: String!, $page: Int, $pageSize: Int, $storeId: String) {
            getCategoryProducts(categoryId: $categoryId, page: $page, pageSize: $pageSize, storeId: $storeId) {
                products {
                    id
                    fullDisplayName
                    thumbnailImageUrl
                    productImageUrls {
                        size
                        url
                    }
                    SKUs {
                        id
                        twelveDigitUPC
                        customerFriendlySize
                        price {
                            regularPrice
                            currentPrice
                        }
                    }
                    productLocation {
                        location
                    }
                    category {
                        id
                        name
                        path
                    }
                }
                pagination {
                    page
                    pageSize
                    totalCount
                    totalPages
                    hasMore
                }
            }
        }
        """
        
        variables = {
            'categoryId': category_id,
            'page': page,
            'pageSize': page_size
        }
        
        if self.store_id:
            variables['storeId'] = self.store_id
        
        return self.client.query(
            query=category_query,
            variables=variables,
            operation_name='GetCategoryProducts'
        )
    
    def extract_product_data(self, product_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract and normalize product data from HEB's Next.js API response.
        
        Args:
            product_data: Raw product data from Next.js search endpoint
            
        Returns:
            Normalized product dictionary or None if invalid
        """
        try:
            product_id = product_data.get('id')
            if not product_id:
                return None
            
            # Skip if already processed
            if product_id in self.discovered_product_ids:
                return None
            
            # Extract basic info (matches Next.js response structure)
            name = product_data.get('fullDisplayName') or product_data.get('displayName', '')
            
            # Extract images (Next.js structure: productImageUrls array with {url, size})
            image_urls = product_data.get('productImageUrls', [])
            image_url = ''
            if image_urls:
                # Prefer LARGE, fall back to MEDIUM, then SMALL
                for size_type in ['LARGE', 'MEDIUM', 'SMALL']:
                    for img in image_urls:
                        if img.get('size') == size_type:
                            image_url = img.get('url', '')
                            break
                    if image_url:
                        break
                # If still no image, take first available
                if not image_url and image_urls:
                    image_url = image_urls[0].get('url', '')
            
            # Extract ALL SKUs (we'll store all of them)
            skus = product_data.get('SKUs', [])
            primary_sku = skus[0] if skus else {}
            sku_id = primary_sku.get('id', '')
            upc = primary_sku.get('twelveDigitUPC', '')
            size = primary_sku.get('customerFriendlySize', '')
            
            # Extract pricing for ONLINE and CURBSIDE contexts
            online_pricing = None
            curbside_pricing = None
            context_prices = primary_sku.get('contextPrices', [])
            for price_info in context_prices:
                context = price_info.get('context', '')
                if context == 'ONLINE':
                    online_pricing = price_info
                elif context == 'CURBSIDE':
                    curbside_pricing = price_info
            
            # Fallback: use first available price for display
            price = 0
            if online_pricing:
                sale_price = online_pricing.get('salePrice', {})
                price = sale_price.get('amount', 0) or online_pricing.get('listPrice', {}).get('amount', 0)
            elif curbside_pricing:
                sale_price = curbside_pricing.get('salePrice', {})
                price = sale_price.get('amount', 0) or curbside_pricing.get('listPrice', {}).get('amount', 0)
            elif context_prices:
                sale_price = context_prices[0].get('salePrice', {})
                price = sale_price.get('amount', 0) or context_prices[0].get('listPrice', {}).get('amount', 0)
            
            # Extract brand information (check multiple possible field names)
            brand_data = product_data.get('brand', {}) or {}
            brand_name = brand_data.get('name', '') or brand_data.get('brandName', '') if brand_data else ''
            is_own_brand = brand_data.get('isOwnBrand', False) or brand_data.get('is_own_brand', False) if brand_data else False
            # If brand name is empty but it's HEB brand, use "HEB"
            if not brand_name and is_own_brand:
                brand_name = 'HEB'
            
            # Extract location (Next.js structure: productLocation: {location})
            location_data = product_data.get('productLocation', {}) or {}
            location = location_data.get('location', '') if location_data else ''
            
            # Extract category (Next.js structure: productCategory: {id, name})
            category_data = product_data.get('productCategory', {}) or {}
            category_name = category_data.get('name', '') if category_data else ''
            category_id = category_data.get('id', '') if category_data else ''
            
            # Extract full category hierarchy (check multiple possible field names)
            full_category_hierarchy = (
                product_data.get('fullCategoryHierarchy', '') or 
                product_data.get('fullCategoryHierarchy', '') or
                product_data.get('categoryPath', '') or
                product_data.get('category_path', '') or
                ''
            )
            
            # Extract inventory/stock status
            inventory_data = product_data.get('inventory', {})
            inventory_state = inventory_data.get('inventoryState', '') if inventory_data else ''
            # Normalize to lowercase
            stock_status = inventory_state.lower() if inventory_state else 'unknown'
            
            # Extract availability information
            availability_data = product_data.get('availability', {})
            availability_schedule = availability_data.get('schedule') if availability_data else None
            unavailability_reasons = availability_data.get('unavailabilityReasons', []) if availability_data else []
            
            # Extract product availability from SKU
            product_availability = primary_sku.get('productAvailability', []) if primary_sku else []
            
            # Extract store ID
            store_id = product_data.get('storeId', self.store_id)
            
            # Extract analytics properties
            analytics_data = product_data.get('analyticsProductProperties', {}) or {}
            
            # Debug: Log missing fields for troubleshooting
            missing_fields = []
            if not brand_name:
                missing_fields.append('brand')
            if not product_data.get('productPageURL') and not product_data.get('productPageUrl'):
                missing_fields.append('productPageURL')
            if not full_category_hierarchy:
                missing_fields.append('fullCategoryHierarchy')
            
            if missing_fields:
                logger.debug(f"Product {product_id} missing fields: {', '.join(missing_fields)}")
            
            return {
                'product_id': str(product_id),  # Ensure string
                'name': name,
                'image_url': image_url,
                'sku_id': sku_id,  # Primary SKU ID
                'upc': upc,  # Primary SKU UPC
                'size': size,  # Primary SKU size
                'price': float(price) if price else 0,  # Effective price for display
                'location': location,
                'category_name': category_name,
                'category_id': category_id,
                'full_category_hierarchy': full_category_hierarchy,
                'store_id': str(store_id) if store_id else None,
                'brand_name': brand_name,
                'product_page_url': (
                    product_data.get('productPageURL', '') or
                    product_data.get('productPageUrl', '') or
                    product_data.get('product_page_url', '') or
                    product_data.get('url', '') or
                    ''
                ),
                'is_new': product_data.get('isNew', False),
                'on_ad': product_data.get('onAd', False),
                'best_available': product_data.get('bestAvailable', False),
                'priced_by_weight': product_data.get('pricedByWeight', False),
                'show_coupon_flag': product_data.get('showCouponFlag', False),
                'in_assortment': product_data.get('inAssortment', True),
                'stock_status': stock_status,
                'availability_schedule': availability_schedule,
                'unavailability_reasons': unavailability_reasons,
                'product_availability': product_availability,
                'minimum_order_quantity': product_data.get('minimumOrderQuantity'),
                'maximum_order_quantity': product_data.get('maximumOrderQuantity'),
                'online_pricing': online_pricing,  # Full pricing object for ONLINE context
                'curbside_pricing': curbside_pricing,  # Full pricing object for CURBSIDE context
                'all_skus': skus,  # All SKUs for this product
                'analytics': analytics_data,  # Analytics properties
                'raw_data': product_data  # Full raw data for storage
            }
        
        except Exception as e:
            logger.error(f"Error extracting product data: {e}")
            logger.debug(f"Product data that failed: {json.dumps(product_data, indent=2)}")
            return None
    
    def parse_and_create_category_hierarchy(self, full_category_hierarchy: str) -> tuple:
        """
        Parse full category hierarchy (e.g., "Pets/Dogs/Food") and create/get categories.
        Returns tuple of (category_id, subcategory_id) where:
        - category_id: UUID of the top-level category (first level)
        - subcategory_id: UUID of the most nested category (last level)
        
        Args:
            full_category_hierarchy: Full category path like "Pets/Dogs/Food" or "Dairy & eggs/Milk"
            
        Returns:
            Tuple of (category_id, subcategory_id), or (None, None) if parsing fails
        """
        if not full_category_hierarchy:
            return (None, None)
        
        try:
            # Split by "/" to get hierarchy levels
            parts = [p.strip() for p in full_category_hierarchy.split('/') if p.strip()]
            if not parts:
                return (None, None)
            
            # Traverse hierarchy, creating categories as needed
            parent_id = None
            top_level_id = None
            most_nested_id = None
            
            for level, category_name in enumerate(parts, start=1):
                # Check if category exists
                query = self.supabase_client.table('categories').select('id').eq('name', category_name)
                if parent_id:
                    query = query.eq('parent_id', parent_id)
                else:
                    query = query.is_('parent_id', 'null')
                query = query.eq('source', 'goods').limit(1)
                
                result = query.execute()
                
                if result.data and len(result.data) > 0:
                    category_uuid = result.data[0]['id']
                else:
                    # Create new category
                    category_data = {
                        'name': category_name,
                        'source': 'goods',
                        'level': level,
                        'is_active': True
                    }
                    if parent_id:
                        category_data['parent_id'] = parent_id
                    
                    # Store category_path on the most nested category
                    if level == len(parts):
                        category_data['category_path'] = full_category_hierarchy
                    
                    insert_result = self.supabase_client.table('categories').insert(category_data).execute()
                    if insert_result.data and len(insert_result.data) > 0:
                        category_uuid = insert_result.data[0]['id']
                    else:
                        logger.warning(f"Failed to create category: {category_name}")
                        return (None, None)
                
                # Track top-level category (first part)
                if level == 1:
                    top_level_id = category_uuid
                
                parent_id = category_uuid
                most_nested_id = category_uuid
            
            return (top_level_id, most_nested_id)
            
        except Exception as e:
            logger.error(f"Error parsing category hierarchy '{full_category_hierarchy}': {e}")
            return (None, None)
    
    def store_product_skus(self, product_uuid: str, all_skus: List[Dict], primary_sku_id: str):
        """Store all SKUs for a product in product_skus table."""
        if not all_skus:
            return
        
        try:
            for idx, sku in enumerate(all_skus):
                sku_id = sku.get('id', '')
                if not sku_id:
                    continue
                
                is_primary = (sku_id == primary_sku_id)
                
                sku_data = {
                    'product_id': product_uuid,
                    'store_name': 'heb',
                    'sku_id': str(sku_id),
                    'upc': sku.get('twelveDigitUPC', ''),
                    'customer_friendly_size': sku.get('customerFriendlySize', ''),
                    'is_primary': is_primary
                }
                
                # Upsert SKU (insert or update if exists)
                self.supabase_client.table('product_skus').upsert(
                    sku_data,
                    on_conflict='product_id,store_name,sku_id'
                ).execute()
                
        except Exception as e:
            logger.warning(f"Error storing SKUs for product {product_uuid}: {e}")
    
    def store_pricing_contexts(self, product_uuid: str, online_pricing: Optional[Dict], 
                              curbside_pricing: Optional[Dict], store_id: str):
        """Store pricing for ONLINE and CURBSIDE contexts."""
        now = datetime.utcnow().isoformat()
        
        for context_name, pricing_data in [('ONLINE', online_pricing), ('CURBSIDE', curbside_pricing)]:
            if not pricing_data:
                continue
            
            try:
                list_price_obj = pricing_data.get('listPrice', {})
                sale_price_obj = pricing_data.get('salePrice', {})
                unit_list_price_obj = pricing_data.get('unitListPrice', {})
                
                list_price = list_price_obj.get('amount', 0) if list_price_obj else 0
                sale_price = sale_price_obj.get('amount', 0) if sale_price_obj else 0
                unit_list_price_unit = unit_list_price_obj.get('unit', '') if unit_list_price_obj else ''
                
                # Effective price: sale_price if on sale, else list_price
                effective_price = sale_price if pricing_data.get('isOnSale', False) else list_price
                
                pricing_record = {
                    'product_id': product_uuid,
                    'store_name': 'heb',
                    'location_id': store_id,
                    'pricing_context': context_name,
                    'list_price': float(list_price) if list_price else None,
                    'sale_price': float(sale_price) if sale_price else None,
                    'price': float(effective_price) if effective_price else 0,
                    'is_on_sale': pricing_data.get('isOnSale', False),
                    'is_price_cut': pricing_data.get('isPriceCut', False),
                    'price_type': pricing_data.get('priceType', ''),
                    'unit_list_price_unit': unit_list_price_unit,
                    'effective_from': now,
                    'effective_to': None
                }
                
                # Close old pricing for this context
                old_pricing = self.supabase_client.table('product_pricing').select('id').eq(
                    'product_id', product_uuid
                ).eq('store_name', 'heb').eq('pricing_context', context_name).is_(
                    'effective_to', 'null'
                ).execute()
                
                if old_pricing.data:
                    self.supabase_client.table('product_pricing').update({
                        'effective_to': now
                    }).eq('id', old_pricing.data[0]['id']).execute()
                
                # Insert new pricing
                self.supabase_client.table('product_pricing').insert(pricing_record).execute()
            
            except Exception as e:
                logger.warning(f"Error storing {context_name} pricing for product {product_uuid}: {e}")
    
    def store_analytics(self, product_uuid: str, analytics_data: Dict):
        """Store analytics properties for a product."""
        if not analytics_data:
            return
        
        try:
            analytics_record = {
                'product_id': product_uuid,
                'store_name': 'heb',
                'is_cross_sell': analytics_data.get('isCrossSell', False),
                'is_everyday_low_price': analytics_data.get('isEveryDayLowPrice', False),
                'is_limited_time_offer': analytics_data.get('isLimitedTimeOffer', False),
                'is_own_brand_upsell': analytics_data.get('isOwnBrandUpsell', False)
            }
            
            self.supabase_client.table('product_analytics').upsert(
                analytics_record,
                on_conflict='product_id,store_name'
            ).execute()
            
        except Exception as e:
            logger.warning(f"Error storing analytics for product {product_uuid}: {e}")
    
    def store_product_in_supabase(self, product: Dict[str, Any]) -> bool:
        """
        Store product in Supabase database with all new fields.
        
        Args:
            product: Normalized product dictionary with all extracted fields
            
        Returns:
            True if successful, False otherwise
        """
        # In dry-run mode, just log the product and return True
        if self.dry_run:
            logger.info(f"  [DRY-RUN] Would store product: {product.get('name', 'Unknown')} (ID: {product.get('product_id', 'N/A')})")
            self.discovered_product_ids.add(product.get('product_id', ''))
            return True
        
        if not self.supabase_service:
            logger.warning("Supabase service not available - skipping product storage")
            return False
            
        try:
            heb_product_id = product['product_id']  # HEB product ID (e.g., "314125")
            store_id = product.get('store_id', self.store_id) or self.store_id
            
            # Check if product already exists by looking in product_store_mappings
            existing_mapping = self.supabase_service.select(
                'product_store_mappings',
                columns='product_id',
                filters={'store_item_id': heb_product_id, 'store_name': 'heb'}
            )
            
            # Parse category hierarchy and get both top-level and most nested category
            category_id = None
            subcategory_id = None
            if product.get('full_category_hierarchy'):
                category_id, subcategory_id = self.parse_and_create_category_hierarchy(product['full_category_hierarchy'])
            
            if existing_mapping:
                # Product exists - check if it already has all new fields
                product_uuid = existing_mapping[0]['product_id']
                
                # Quick check: if product already has raw_data, brand, and other new fields, skip detailed update
                # This optimization speeds up re-runs when products are already fully populated
                existing_product = self.supabase_client.table('products').select(
                    'raw_data,brand,product_page_url,full_category_hierarchy'
                ).eq('id', product_uuid).limit(1).execute()
                
                if existing_product.data and len(existing_product.data) > 0:
                    existing = existing_product.data[0]
                    # If product already has raw_data and brand, it's likely fully updated
                    # Only do a quick update for pricing/stock status changes
                    # But also update category_id if it's missing
                    if existing.get('raw_data') and existing.get('brand') is not None:
                        logger.debug(f"Product {heb_product_id} already has all fields populated, doing quick update...")
                        
                        # Quick update: only update pricing and stock status (these change frequently)
                        # Also update category_id if missing
                        product_update = {}
                        if category_id:
                            # Check if product is missing category_id
                            existing_product_full = self.supabase_client.table('products').select('category_id').eq('id', product_uuid).limit(1).execute()
                            if existing_product_full.data and not existing_product_full.data[0].get('category_id'):
                                product_update['category_id'] = category_id
                        
                        if product_update:
                            self.supabase_client.table('products').update(product_update).eq('id', product_uuid).execute()
                        
                        mapping_update = {
                            'stock_status': product.get('stock_status', 'unknown'),
                            'store_location_text': product.get('location'),
                            'updated_at': datetime.utcnow().isoformat()
                        }
                        
                        self.supabase_client.table('product_store_mappings').update(mapping_update).eq(
                            'product_id', product_uuid
                        ).eq('store_name', 'heb').eq('store_item_id', heb_product_id).execute()
                        
                        # Update pricing if changed
                        self.store_pricing_contexts(
                            product_uuid,
                            product.get('online_pricing'),
                            product.get('curbside_pricing'),
                            store_id
                        )
                        
                        self.discovered_product_ids.add(heb_product_id)
                        return True
                
                # Product exists but missing new fields - do full update
                logger.debug(f"Product {heb_product_id} exists but missing new fields, updating...")
                
                # Update product with all new fields (only include non-empty values)
                product_update = {
                    'name': product['name'],
                    'image_url': product['image_url'],
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                # Only add fields if they have values (avoid overwriting with empty strings)
                if product.get('brand_name'):
                    product_update['brand'] = product['brand_name']
                if product.get('product_page_url'):
                    product_update['product_page_url'] = product['product_page_url']
                if product.get('full_category_hierarchy'):
                    product_update['full_category_hierarchy'] = product['full_category_hierarchy']
                
                # Always store raw_data (it's the full API response)
                if product.get('raw_data'):
                    product_update['raw_data'] = product['raw_data']
                else:
                    logger.warning(f"Product {heb_product_id} has no raw_data - this should not happen")
                
                # Boolean fields can always be set
                product_update.update({
                    'is_new': product.get('is_new', False),
                    'on_ad': product.get('on_ad', False),
                    'best_available': product.get('best_available', False),
                    'priced_by_weight': product.get('priced_by_weight', False),
                    'show_coupon_flag': product.get('show_coupon_flag', False),
                    'in_assortment': product.get('in_assortment', True)
                })
                
                # Add category/subcategory
                if category_id:
                    product_update['category_id'] = category_id
                if subcategory_id:
                    product_update['subcategory_id'] = subcategory_id
                
                # Add UPC and unit_of_measure if available
                if product.get('upc'):
                    product_update['upc'] = product['upc']
                if product.get('size'):
                    product_update['unit_of_measure'] = product['size']
                
                self.supabase_client.table('products').update(product_update).eq('id', product_uuid).execute()
                
                # Update store mapping with new fields
                mapping_update = {
                    'store_item_name': product['name'],
                    'store_image_url': product['image_url'],
                    'stock_status': product.get('stock_status', 'unknown'),
                    'store_location_text': product.get('location'),
                    'availability_schedule': product.get('availability_schedule'),
                    'unavailability_reasons': product.get('unavailability_reasons', []),
                    'product_availability': product.get('product_availability', []),
                    'minimum_order_quantity': product.get('minimum_order_quantity'),
                    'maximum_order_quantity': product.get('maximum_order_quantity'),
                    'is_active': True,
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                self.supabase_client.table('product_store_mappings').update(mapping_update).eq(
                    'product_id', product_uuid
                ).eq('store_name', 'heb').eq('store_item_id', heb_product_id).execute()
                
                # Store all SKUs
                if product.get('all_skus'):
                    self.store_product_skus(product_uuid, product['all_skus'], product.get('sku_id', ''))
                
                # Store pricing for both contexts
                self.store_pricing_contexts(
                    product_uuid,
                    product.get('online_pricing'),
                    product.get('curbside_pricing'),
                    store_id
                )
                
                # Store analytics
                if product.get('analytics'):
                    self.store_analytics(product_uuid, product['analytics'])
                
            else:
                # Create new product with all fields (only include non-empty values)
                product_data = {
                    'name': product['name'],
                    'image_url': product['image_url'],
                    'is_new': product.get('is_new', False),
                    'on_ad': product.get('on_ad', False),
                    'best_available': product.get('best_available', False),
                    'priced_by_weight': product.get('priced_by_weight', False),
                    'show_coupon_flag': product.get('show_coupon_flag', False),
                    'in_assortment': product.get('in_assortment', True),
                    'is_active': True
                }
                
                # Only add fields if they have values
                if product.get('brand_name'):
                    product_data['brand'] = product['brand_name']
                if product.get('product_page_url'):
                    product_data['product_page_url'] = product['product_page_url']
                if product.get('full_category_hierarchy'):
                    product_data['full_category_hierarchy'] = product['full_category_hierarchy']
                
                # Always store raw_data (it's the full API response)
                if product.get('raw_data'):
                    product_data['raw_data'] = product['raw_data']
                else:
                    logger.warning(f"New product {heb_product_id} has no raw_data - this should not happen")
                
                # Add category/subcategory
                if category_id:
                    product_data['category_id'] = category_id
                if subcategory_id:
                    product_data['subcategory_id'] = subcategory_id
                
                # Add UPC and unit_of_measure if available
                if product.get('upc'):
                    product_data['upc'] = product['upc']
                if product.get('size'):
                    product_data['unit_of_measure'] = product['size']
                
                result = self.supabase_client.table('products').insert(product_data).execute()
                
                if result.data and len(result.data) > 0:
                    new_product_id = result.data[0]['id']
                    
                    # Create store mapping with all fields
                    store_mapping = {
                        'product_id': new_product_id,
                        'store_name': 'heb',
                        'store_item_id': heb_product_id,
                        'store_item_name': product['name'],
                        'store_image_url': product['image_url'],
                        'stock_status': product.get('stock_status', 'unknown'),
                        'store_location_text': product.get('location'),
                        'availability_schedule': product.get('availability_schedule'),
                        'unavailability_reasons': product.get('unavailability_reasons', []),
                        'product_availability': product.get('product_availability', []),
                        'minimum_order_quantity': product.get('minimum_order_quantity'),
                        'maximum_order_quantity': product.get('maximum_order_quantity'),
                        'is_active': True
                    }
                    
                    self.supabase_client.table('product_store_mappings').insert(store_mapping).execute()
                    
                    # Store all SKUs
                    if product.get('all_skus'):
                        self.store_product_skus(new_product_id, product['all_skus'], product.get('sku_id', ''))
                    
                    # Store pricing for both contexts
                    self.store_pricing_contexts(
                        new_product_id,
                        product.get('online_pricing'),
                        product.get('curbside_pricing'),
                        store_id
                    )
                    
                    # Store analytics
                    if product.get('analytics'):
                        self.store_analytics(new_product_id, product['analytics'])
                else:
                    logger.error(f"Failed to create product for HEB ID {heb_product_id}")
                    return False
            
            self.discovered_product_ids.add(heb_product_id)
            return True
        
        except Exception as e:
            logger.error(f"Error storing product {product.get('product_id', 'unknown')} in Supabase: {e}", exc_info=True)
            return False
    
    def search_products_by_category(self, category_name: str, page: int = 0, page_size: int = 50):
        """
        Search for products in a specific category using HEB's search endpoint.
        This uses category name as search query to get category-specific products.
        
        Args:
            category_name: Category name to search for
            page: Page number (0-indexed)
            page_size: Number of results per page
            
        Returns:
            Dict with search results
        """
        return self.search_products(category_name, page, page_size)
    
    def get_products_from_category_url(self, category_url: str, page: int = 1):
        """
        Get products from a category URL.
        
        Args:
            category_url: Category URL path
            page: Page number (1-indexed)
            
        Returns:
            Dict with product results
        """
        return self.get_category_products_from_url(category_url, page)
    
    def scrape_category(self, category: Dict[str, Any]) -> int:
        """
        Scrape all products from a category with proper pagination.
        
        Args:
            category: Category dictionary with name, id, url (optional), path (optional)
            
        Returns:
            Number of products scraped
        """
        category_name = category.get('name', '')
        category_id = category.get('id', '')
        category_url = category.get('url')  # Direct category URL if available
        
        logger.info(f"Scraping category: {category_name} (ID: {category_id})")
        category_scraped = 0
        page = 1  # Start at page 1 (1-indexed for category URLs)
        page_size = 50
        has_more = True
        consecutive_empty_pages = 0
        max_empty_pages = 2  # Stop after 2 consecutive empty pages
        sct = None  # sct parameter for pagination
        
        while has_more:
            # Check if we've reached the max items limit
            if self.max_items and self.scraped_count >= self.max_items:
                logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                break
            
            logger.info(f"  Page {page}...")
            
            # Use category URL HTML scraping method (most comprehensive - gets ALL products)
            response = None
            if category_url:
                response = self.get_category_products_from_url(category_url, page, sct)
            
            # If category URL method failed, fall back to search as last resort
            if not response or not response.get('success'):
                if category_url:
                    logger.warning(f"  Category HTML scraping failed, falling back to search for '{category_name}'")
                response = self.search_products_by_category(category_name, page - 1, page_size)
            
            if not response.get('success', False):
                errors = response.get('errors', [])
                error_msg = errors[0].get('message', 'Unknown error') if errors else 'Unknown error'
                logger.error(f"  Failed to get products for category {category_name}: {error_msg}")
                consecutive_empty_pages += 1
                if consecutive_empty_pages >= max_empty_pages:
                    logger.warning(f"  Too many failures, stopping category scrape")
                    break
                page += 1
                time.sleep(self._get_random_delay())
                continue
            
            # Extract products from response (Next.js format)
            data = response.get('data', {})
            search_result = data.get('searchProducts', {})
            products = search_result.get('products', [])
            pagination = search_result.get('pagination', {})
            
            if not products:
                consecutive_empty_pages += 1
                logger.warning(f"  No products found on page {page + 1}")
                if consecutive_empty_pages >= max_empty_pages:
                    logger.info(f"  No more products found, ending category scrape")
                    break
                page += 1
                time.sleep(self._get_random_delay())
                continue
            
            # Reset consecutive empty pages counter
            consecutive_empty_pages = 0
            
            # Process each product
            page_scraped = 0
            for product_data in products:
                # Check if we've reached the max items limit
                if self.max_items and self.scraped_count >= self.max_items:
                    logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                    has_more = False
                    break
                
                product = self.extract_product_data(product_data)
                if product:
                    # Store all products found (category filtering happens at search level)
                    if self.store_product_in_supabase(product):
                        category_scraped += 1
                        page_scraped += 1
                        self.scraped_count += 1
                    else:
                        self.failed_count += 1
            
            logger.info(f"  Scraped {page_scraped} products from page {page}")
            
            # Check pagination
            has_more = pagination.get('hasMore', False)
            total_pages = pagination.get('totalPages', 0)
            total_count = pagination.get('totalCount', 0)
            
            # Extract sct parameter for next page if available
            next_sct = pagination.get('next_sct')
            if next_sct:
                sct = next_sct
                logger.debug(f"  Extracted sct parameter for next page: {sct[:20]}...")
            
            # Log pagination info
            if total_count > 0:
                logger.info(f"  Progress: {page}/{total_pages if total_pages > 0 else '?'} pages, {total_count} total products")
            
            # Stop if we've gone beyond the reported total pages
            if total_pages > 0 and page >= total_pages:
                logger.info(f"  Reached total pages ({total_pages}), stopping")
                break
            
            # Stop if we've had many consecutive pages with no new products
            if page_scraped == 0 and page >= 3:
                logger.info(f"  No new products on last page, checking if we should continue...")
                if page >= 5:  # Give it a few more pages to be sure
                    logger.info(f"  Stopping - multiple consecutive pages with no new products")
                    break
            
            if has_more or (total_pages > 0 and page < total_pages):
                page += 1
                # Rate limiting with random variance
                delay = self._get_random_delay()
                logger.debug(f"Waiting {delay:.2f}s before next page...")
                time.sleep(delay)
            else:
                logger.info(f"  No more pages available")
                break
        
        logger.info(f"  ✅ Scraped {category_scraped} products from {category_name}")
        return category_scraped
    
    def scrape_by_search_terms(self, search_terms: List[str]) -> int:
        """
        Scrape products using search terms.
        
        Args:
            search_terms: List of search query strings
            
        Returns:
            Number of products scraped
        """
        logger.info(f"Scraping using {len(search_terms)} search terms...")
        total_scraped = 0
        
        for term in search_terms:
            logger.info(f"Searching for: {term}")
            page = 0
            page_size = 50
            
            response = self.search_products(term, page, page_size)
            
            if not response.get('success', False):
                errors = response.get('errors', [])
                error_msg = errors[0].get('message', 'Unknown error') if errors else 'Unknown error'
                logger.error(f"  Search failed for '{term}': {error_msg}")
                time.sleep(self.rate_limit_delay)
                continue
            
            # Extract products from response (Next.js format)
            data = response.get('data', {})
            search_result = data.get('searchProducts', {})
            products = search_result.get('products', [])
            pagination = search_result.get('pagination', {})
            
            if not products:
                logger.info(f"  No products found for '{term}'")
                time.sleep(self.rate_limit_delay)
                continue
            
            logger.info(f"  Found {len(products)} products for '{term}'")
            
            term_scraped = 0
            for product_data in products:
                # Check if we've reached the max items limit
                if self.max_items and self.scraped_count >= self.max_items:
                    logger.info(f"  Reached max items limit ({self.max_items}), stopping...")
                    return total_scraped
                
                product = self.extract_product_data(product_data)
                if product:
                    if self.store_product_in_supabase(product):
                        term_scraped += 1
                        total_scraped += 1
                        self.scraped_count += 1
                    else:
                        self.failed_count += 1
            
            # Check pagination (Note: Next.js endpoint may return all results at once)
            total_count = pagination.get('totalCount', len(products))
            
            logger.info(f"  ✅ Scraped {term_scraped} products from '{term}' (total available: {total_count})")
            
            # Rate limiting with random variance
            delay = self._get_random_delay()
            logger.debug(f"Waiting {delay:.2f}s before next search...")
            time.sleep(delay)
        
        return total_scraped
    
    def run(self, strategy: str = 'categories'):
        """
        Run the scraper.
        
        Args:
            strategy: Scraping strategy ('categories', 'search', or 'both')
        """
        logger.info("=" * 60)
        logger.info("HEB Product Scraper")
        logger.info("=" * 60)
        
        start_time = time.time()
        
        if strategy in ['categories', 'both']:
            # Discover and filter categories (grocery only)
            categories = self.discover_categories()
            categories = self.filter_grocery_categories(categories)
            
            logger.info(f"Scraping {len(categories)} grocery categories...")
            
            for i, category in enumerate(categories, 1):
                if self.max_items and self.scraped_count >= self.max_items:
                    logger.info(f"Reached max items limit ({self.max_items}), stopping...")
                    break
                
                logger.info(f"Processing category {i}/{len(categories)}: {category['name']}")
                self.scrape_category(category)
                # Extra delay between categories with variance (reduced for faster updates)
                if i < len(categories):  # Don't delay after last category
                    delay = self._get_random_delay() * 1.5
                    logger.debug(f"Waiting {delay:.2f}s before next category...")
                    time.sleep(delay)
        
        if strategy in ['search', 'both']:
            # Common grocery search terms
            all_search_terms = [
                # Broad terms
                'milk', 'bread', 'eggs', 'chicken', 'beef', 'pork', 'fish',
                'cheese', 'yogurt', 'butter', 'cereal', 'pasta', 'rice',
                # Produce
                'apple', 'banana', 'orange', 'lettuce', 'tomato', 'onion',
                'potato', 'carrot', 'celery', 'pepper', 'garlic',
                # Pantry
                'canned', 'soup', 'sauce', 'spices', 'oil', 'vinegar',
                # Beverages
                'water', 'soda', 'juice', 'coffee', 'tea', 'beer', 'wine',
                # Snacks
                'chips', 'cookies', 'crackers', 'nuts', 'candy',
                # Frozen
                'frozen', 'ice cream', 'pizza', 'vegetables',
            ]
            
            # Limit search terms if specified (for testing)
            limit_terms = getattr(self, 'limit_terms', None)
            if limit_terms:
                search_terms = all_search_terms[:limit_terms]
                logger.info(f"Limited to first {limit_terms} search terms for testing")
            else:
                search_terms = all_search_terms
            
            self.scrape_by_search_terms(search_terms)
        
        elapsed_time = time.time() - start_time
        
        logger.info("=" * 60)
        logger.info("Scraping Complete!")
        logger.info(f"  ✅ Scraped: {self.scraped_count} products")
        logger.info(f"  ❌ Failed: {self.failed_count} products")
        logger.info(f"  ⏱️  Time: {elapsed_time:.2f} seconds")
        logger.info("=" * 60)


def main():
    """Main entry point for the scraper."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape HEB products')
    parser.add_argument('--strategy', choices=['categories', 'search', 'both'], default='both',
                       help='Scraping strategy (default: both)')
    parser.add_argument('--store-id', type=str, 
                       help='HEB store ID (optional, can also use HEB_STORE_ID env var). '
                            'Example: 202. To find your store ID, check product responses where "storeId" field appears.')
    parser.add_argument('--cookies', type=str, help='Authentication cookies (required for authenticated requests)')
    parser.add_argument('--rate-limit', type=float, default=0.8,
                       help='Base delay between requests in seconds (default: 0.8)')
    parser.add_argument('--rate-limit-variance', type=float, default=0.3,
                       help='Random variance in delay in seconds (default: 0.3)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Run without saving to database (useful for testing)')
    parser.add_argument('--limit-terms', type=int,
                       help='Limit number of search terms to use (useful for testing)')
    parser.add_argument('--max-items', type=int,
                       help='Maximum number of items to scrape (useful for testing)')
    
    args = parser.parse_args()
    
    # Get cookies from environment if not provided
    cookies = args.cookies or os.getenv('HEB_COOKIES')
    
    # Get store_id from argument (takes precedence) or environment variable
    store_id = args.store_id or os.getenv('HEB_STORE_ID')
    
    if not cookies:
        logger.warning("No cookies provided. Some requests may fail without authentication.")
    
    if store_id:
        logger.info(f"Using store ID: {store_id}")
    else:
        logger.info("No store ID specified. Products will be scraped without store-specific context.")
    
    # Create scraper
    scraper = HEBScraper(store_id=store_id, cookies=cookies, dry_run=args.dry_run)
    # Update rate limiting (already set in __init__, but allow override)
    scraper.rate_limit_delay = args.rate_limit
    scraper.rate_limit_variance = args.rate_limit_variance
    if args.limit_terms:
        scraper.limit_terms = args.limit_terms
    if args.max_items:
        scraper.max_items = args.max_items
        logger.info(f"Limiting scrape to {args.max_items} items")
    
    # Run scraper
    scraper.run(strategy=args.strategy)


if __name__ == '__main__':
    main()

