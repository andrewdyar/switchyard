#!/usr/bin/env python3
"""
Central Market Full Scraper - Save to JSON File

Scrapes ALL products from Central Market and saves to a JSON file with
ALL fields specified in RETAILER_SCRAPING_GUIDE.md:

Per documentation, Central Market field mapping:
| API Field                | Goods Schema Field    |
|--------------------------|----------------------|
| productId                | external_id          |
| sku                      | barcode              |
| description              | name                 |
| brand.name               | brand                |
| currentPrice.amount      | cost_price           |
| originalPrice.amount     | list_price           |
| unitListPrice.amount     | price_per_unit       |
| unitListPrice.unit       | price_per_unit_uom   |
| image.url                | image_url            |
| aisle_location           | store_location       |
| category.name            | category             |

Usage:
    python run_cm_scrape_to_file.py
"""

import os
import sys
import json
import time
import logging
import requests
from datetime import datetime
from typing import Dict, List, Any
from bs4 import BeautifulSoup

# Add project root to path (2 levels up from scrapers/central_market/)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from retailers.central_market.scraper import CentralMarketScraper
from core.category_mapping import normalize_category

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'cm_scrape_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)

# Root categories (from earlier discovery)
ROOT_CATEGORIES = [
    {"id": "483475", "name": "Fruits & Vegetables", "product_count": 862},
    {"id": "1246473", "name": "Meat & Poultry", "product_count": 557},
    {"id": "1210269", "name": "Seafood", "product_count": 134},
    {"id": "483476", "name": "Grocery & Staples", "product_count": 9657},
    {"id": "1547011", "name": "Bulk Foods", "product_count": 940},
    {"id": "483468", "name": "Dairy & Eggs", "product_count": 1104},
    {"id": "483467", "name": "Chef Prepared", "product_count": 251},
    {"id": "1309768", "name": "Deli", "product_count": 400},
    {"id": "483466", "name": "Cheese", "product_count": 485},
    {"id": "483465", "name": "Bakery", "product_count": 399},
    {"id": "457644", "name": "Wine & Beer", "product_count": 3256},
    {"id": "1147615", "name": "Floral", "product_count": 72},
    {"id": "483471", "name": "Frozen", "product_count": 1204},
    {"id": "1329887", "name": "Healthy Living", "product_count": 5129},
    {"id": "1174535", "name": "Beverages", "product_count": 1191},
    {"id": "1379429", "name": "Household", "product_count": 703},
    {"id": "1329930", "name": "Kids & Baby", "product_count": 284},
]


def normalize_product_for_schema(product: Dict, category_name: str) -> Dict[str, Any]:
    """
    Normalize product to match RETAILER_SCRAPING_GUIDE.md schema exactly.
    
    Returns a dict with ALL required fields per documentation.
    """
    # Get actual category from product data (more specific than root category)
    actual_category = product.get('category') or category_name
    actual_subcategory = product.get('subcategory') or category_name
    
    # Get Goods taxonomy mapping using actual category data
    goods_category, goods_subcategory = normalize_category(
        'central_market', 
        actual_subcategory,  # subcategory (e.g., "Avocados")
        actual_category      # parent (e.g., "Fruits & Vegetables")
    )
    
    # If still uncategorized, try mapping the parent directly
    if goods_category == 'uncategorized':
        # Try common parent category mappings
        parent_map = {
            'Fruits & Vegetables': ('fruit_vegetables', None),
            'Meat & Poultry': ('meat_seafood', None),
            'Seafood': ('meat_seafood', 'seafood'),
            'Grocery & Staples': ('pantry', None),
            'Bulk Foods': ('pantry', None),
            'Dairy & Eggs': ('dairy_eggs', None),
            'Chef Prepared': ('deli_prepared_food', None),
            'Deli': ('deli_prepared_food', None),
            'Cheese': ('dairy_eggs', 'cheese'),
            'Bakery': ('bakery_bread', None),
            'Wine & Beer': ('beverages', 'beer_wine'),
            'Floral': ('household', None),
            'Frozen': ('frozen', None),
            'Healthy Living': ('household', None),
            'Beverages': ('beverages', None),
            'Household': ('household', None),
            'Kids & Baby': ('household', None),
        }
        goods_category, goods_subcategory = parent_map.get(
            actual_category, 
            ('uncategorized', None)
        )
    
    return {
        # === Core Product Fields (per documentation) ===
        'external_id': product.get('external_id'),           # productId
        'barcode': product.get('barcode'),                   # UPC from GraphQL enrichment
        'name': product.get('name'),                         # description
        'brand': product.get('brand'),                       # brand.name from GraphQL
        
        # === Pricing Fields ===
        'cost_price': product.get('cost_price'),             # currentPrice.amount
        'list_price': product.get('list_price'),             # originalPrice.amount (if on sale)
        'price_per_unit': product.get('price_per_unit'),     # unitListPrice.amount
        'price_per_unit_uom': product.get('price_per_unit_uom'),  # unitListPrice.unit
        
        # === Product Details ===
        'image_url': product.get('image_url'),               # image.url
        'store_location': product.get('store_location'),     # aisle_location
        'size': product.get('size'),                         # Package size
        'description': product.get('description'),           # Full description
        
        # === Category Mapping ===
        'retailer_category': actual_category,                # CM parent category
        'retailer_subcategory': actual_subcategory,          # CM subcategory  
        'goods_category': goods_category,                    # Mapped Goods category
        'goods_subcategory': goods_subcategory,              # Mapped Goods subcategory
        
        # === Availability & Flags ===
        'is_available': product.get('is_available', True),
        'is_on_sale': product.get('is_on_sale', False),
        'snap_eligible': product.get('snap_eligible'),
        'sold_by': product.get('sold_by'),                   # "each", "lb", etc.
        
        # === Metadata ===
        'retailer': 'central_market',
        'store_id': '61',                                    # Austin North Lamar
        'scraped_at': datetime.utcnow().isoformat(),
        
        # === Raw Data (for debugging/future use) ===
        'raw_data': product,
    }


def test_cookies() -> bool:
    """Test if current cookies are valid."""
    try:
        with open('.central_market_cookies.json') as f:
            data = json.load(f)
            cookies = data.get('cookies', {})
        
        if not cookies:
            logger.error("No cookies found!")
            return False
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        # Test with a small category
        url = 'https://www.centralmarket.com/product-category/browse/1147615'  # Floral
        resp = requests.get(url, cookies=cookies, headers=headers, timeout=30)
        
        if resp.status_code != 200:
            logger.error(f"Cookie test failed: Status {resp.status_code}")
            return False
        
        if 'Pardon Our Interruption' in resp.text or 'incapsula' in resp.text.lower():
            logger.error("Cookie test failed: Blocked by Incapsula")
            return False
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        if not script:
            logger.error("Cookie test failed: No __NEXT_DATA__ found")
            return False
        
        logger.info("✅ Cookies are valid!")
        return True
        
    except Exception as e:
        logger.error(f"Cookie test error: {e}")
        return False


def run_scrape_to_file(output_file: str = 'cm_products.json', resume_from: int = 0, skip_test: bool = False):
    """
    Run full category-based scrape and save to JSON file.
    
    Args:
        output_file: Path to output JSON file
        resume_from: Category index to resume from (0-based)
        skip_test: Skip initial cookie test
    """
    logger.info("=" * 70)
    logger.info("CENTRAL MARKET SCRAPER - SAVE TO FILE")
    logger.info(f"Output: {output_file}")
    logger.info(f"Expected: ~26,628 products across 17 categories")
    logger.info("=" * 70)
    
    # Test cookies before starting
    if not skip_test:
        logger.info("Testing cookies before starting...")
        if not test_cookies():
            logger.error("❌ Cookie test failed! Please provide fresh cookies.")
            return None
    
    # Initialize scraper
    scraper = CentralMarketScraper(
        store_id="61",
        delay=1.5,
        dry_run=True  # Don't try Supabase
    )
    
    all_products = []
    seen_ids = set()
    stats = {
        'categories_scraped': 0,
        'products_scraped': 0,
        'products_with_upc': 0,
        'products_with_brand': 0,
        'products_with_price_per_unit': 0,
        'errors': [],
        'last_successful_category': -1,
        'start_time': datetime.now().isoformat(),
    }
    
    # Load existing data if resuming
    if resume_from > 0 or os.path.exists(output_file):
        try:
            with open(output_file) as f:
                existing_data = json.load(f)
                all_products = existing_data.get('products', [])
                seen_ids = {p['external_id'] for p in all_products}
                prev_stats = existing_data.get('metadata', {}).get('stats', {})
                stats['last_successful_category'] = prev_stats.get('last_successful_category', -1)
                
                # If resume_from not specified, resume from last successful + 1
                if resume_from == 0 and stats['last_successful_category'] >= 0:
                    resume_from = stats['last_successful_category'] + 1
                
                logger.info(f"Resuming with {len(all_products)} existing products, starting at category {resume_from}")
        except Exception as e:
            logger.warning(f"Could not load existing file: {e}")
    
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 2  # Stop after 2 consecutive failures (likely blocked)
    
    for cat_idx, category in enumerate(ROOT_CATEGORIES):
        if cat_idx < resume_from:
            continue
            
        cat_id = category['id']
        cat_name = category['name']
        expected = category['product_count']
        
        logger.info(f"\n{'='*60}")
        logger.info(f"[{cat_idx + 1}/{len(ROOT_CATEGORIES)}] {cat_name}")
        logger.info(f"Expected: ~{expected:,} products")
        logger.info(f"{'='*60}")
        
        try:
            # Scrape all pages for this category
            raw_products = scraper.search_all_pages(category_id=cat_id, max_pages=200)
            
            if not raw_products:
                logger.warning(f"No products found for {cat_name} - may be blocked")
                stats['errors'].append(f"{cat_name}: No products (blocked?)")
                consecutive_failures += 1
                
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    logger.error(f"❌ {MAX_CONSECUTIVE_FAILURES} consecutive failures - likely blocked!")
                    logger.error(f"Resume command: python run_cm_scrape_to_file.py --resume {cat_idx}")
                    break
                continue
            
            # Reset failure counter on success
            consecutive_failures = 0
            
            # Extract product data
            extracted = []
            for raw in raw_products:
                product = scraper.extract_product_data(raw)
                pid = product.get('external_id')
                
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    extracted.append(product)
            
            logger.info(f"Extracted {len(extracted)} unique products from {cat_name}")
            
            # Enrich with UPC/brand via GraphQL
            if extracted:
                enriched = scraper.enrich_products_batch(extracted, filter_store=True)
                
                # Normalize and add to results
                for product in enriched:
                    normalized = normalize_product_for_schema(product, cat_name)
                    all_products.append(normalized)
                    
                    # Update stats
                    if normalized.get('barcode'):
                        stats['products_with_upc'] += 1
                    if normalized.get('brand'):
                        stats['products_with_brand'] += 1
                    if normalized.get('price_per_unit'):
                        stats['products_with_price_per_unit'] += 1
                
                logger.info(f"Enriched {len(enriched)} products")
            
            stats['categories_scraped'] += 1
            stats['products_scraped'] = len(all_products)
            stats['last_successful_category'] = cat_idx
            
            logger.info(f"Running total: {len(all_products):,} unique products")
            
            # Save progress after each category
            save_to_file(output_file, all_products, stats)
            
        except Exception as e:
            logger.error(f"Error scraping {cat_name}: {e}", exc_info=True)
            stats['errors'].append(f"{cat_name}: {str(e)}")
            consecutive_failures += 1
            
            # Save what we have so far
            save_to_file(output_file, all_products, stats)
            
            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                logger.error(f"❌ {MAX_CONSECUTIVE_FAILURES} consecutive failures - stopping!")
                logger.error(f"Resume command: python run_cm_scrape_to_file.py --resume {cat_idx}")
                break
        
        # Short delay between categories
        time.sleep(2)
    
    # Final save
    stats['end_time'] = datetime.now().isoformat()
    save_to_file(output_file, all_products, stats)
    
    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("SCRAPE COMPLETE")
    logger.info(f"  Categories: {stats['categories_scraped']}/{len(ROOT_CATEGORIES)}")
    logger.info(f"  Total unique products: {len(all_products):,}")
    logger.info(f"  Products with UPC: {stats['products_with_upc']:,}")
    logger.info(f"  Products with brand: {stats['products_with_brand']:,}")
    logger.info(f"  Products with price_per_unit: {stats['products_with_price_per_unit']:,}")
    logger.info(f"  Errors: {len(stats['errors'])}")
    logger.info(f"  Output file: {output_file}")
    logger.info("=" * 70)
    
    return stats


def save_to_file(filepath: str, products: List[Dict], stats: Dict):
    """Save products and stats to JSON file."""
    output = {
        'metadata': {
            'retailer': 'central_market',
            'store_id': '61',
            'store_name': 'Austin North Lamar',
            'scraped_at': datetime.utcnow().isoformat(),
            'total_products': len(products),
            'stats': stats,
        },
        'products': products,
    }
    
    with open(filepath, 'w') as f:
        json.dump(output, f, indent=2, default=str)
    
    logger.info(f"Saved {len(products):,} products to {filepath}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Central Market Scraper - Save to File')
    parser.add_argument('--output', '-o', type=str, default='cm_products.json',
                       help='Output JSON file path')
    parser.add_argument('--resume', '-r', type=int, default=0,
                       help='Resume from category index (0-based)')
    parser.add_argument('--skip-test', action='store_true',
                       help='Skip initial cookie validation test')
    
    args = parser.parse_args()
    
    run_scrape_to_file(output_file=args.output, resume_from=args.resume, skip_test=args.skip_test)

