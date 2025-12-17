"""
Import Central Market products to Supabase.

This script:
1. Reads scraped CM products from cm_products.json
2. Maps retailer categories to Goods categories using category_mapping.py
3. Matches by UPC to existing products (merge strategy)
4. Creates new products for unmatched UPCs
5. Adds product_store_mappings and product_pricing entries
6. Flags uncategorized products for manual review
"""

import json
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

# Ensure stdout is unbuffered
sys.stdout.reconfigure(line_buffering=True)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env'))

from app.supabase_client import get_client
from core.category_mapping import normalize_category, CENTRALMARKET_CATEGORY_MAP
from core.category_lookup import get_category_id, get_subcategory_id

# Statistics
stats = {
    'total': 0,
    'matched_upc': 0,
    'new_products': 0,
    'updated_products': 0,
    'store_mappings_added': 0,
    'pricing_added': 0,
    'uncategorized': 0,
    'errors': 0,
}

# Store name constant
STORE_NAME = 'central_market'


def map_cm_category(product_data):
    """Map Central Market category to Goods category using retailer categories."""
    retailer_cat = product_data.get('retailer_category', '')
    raw_data = product_data.get('raw_data', {})
    retailer_subcat = raw_data.get('subcategory', '')
    
    # IGNORE the goods_category from scraped data - it was incorrectly mapped
    # Use normalize_category from category_mapping.py with retailer categories
    # Format: normalize_category(retailer, subcategory, parent_category)
    goods_cat, goods_subcat = normalize_category('central_market', retailer_subcat, retailer_cat)
    
    # Debug logging for first few
    if goods_cat == 'uncategorized' and retailer_cat:
        # Try direct parent category mapping if subcategory not found
        # Some CM categories are top-level without subcategories
        direct_map = {
            'Fruits & Vegetables': ('fruit_vegetables', 'fruit'),
            'Meat & Poultry': ('meat_seafood', 'meat'),
            'Seafood': ('meat_seafood', 'seafood'),
            'Grocery & Staples': ('pantry', None),
            'Bulk Foods': ('pantry', None),
            'Dairy & Eggs': ('dairy_eggs', None),
            'Chef Prepared': ('deli_prepared_food', 'ready_meals_snacks'),
            'Deli': ('deli_prepared_food', 'meat'),
            'Cheese': ('dairy_eggs', 'cheese'),
            'Bakery': ('bakery_bread', 'bread'),
            'Frozen': ('frozen_food', 'meals_sides'),
            'Beverages': ('beverages', None),
            'Kids & Baby': ('baby_kids', None),
            'Household': ('everyday_essentials', 'cleaners'),
        }
        if retailer_cat in direct_map:
            goods_cat, goods_subcat = direct_map[retailer_cat]
    
    return goods_cat, goods_subcat


def find_existing_product_by_upc(supabase, upc):
    """Find existing product by UPC."""
    if not upc or upc == 'None' or len(upc) < 6:
        return None
    
    result = supabase.table('products').select('id, name, category_id').eq('upc', upc).execute()
    if result.data:
        return result.data[0]
    return None


def create_or_update_product(supabase, product_data, category_cache):
    """Create or update a product in Supabase."""
    global stats
    
    upc = product_data.get('barcode')
    external_id = product_data.get('external_id')
    
    # Map category
    goods_cat, goods_subcat = map_cm_category(product_data)
    
    # Get category IDs
    if goods_cat in category_cache:
        category_id = category_cache[goods_cat]
    else:
        category_id = get_category_id(supabase, goods_cat.replace('_', ' ').title() if '_' in goods_cat else goods_cat.title())
        if not category_id:
            # Try with proper formatting
            cat_name_map = {
                'fruit_vegetables': 'Fruit & vegetables',
                'meat_seafood': 'Meat & seafood',
                'bakery_bread': 'Bakery & bread',
                'dairy_eggs': 'Dairy & eggs',
                'deli_prepared_food': 'Deli & prepared food',
                'everyday_essentials': 'Everyday essentials',
                'frozen_food': 'Frozen food',
                'health_beauty': 'Health & beauty',
                'baby_kids': 'Baby & kids',
                'pantry': 'Pantry',
                'beverages': 'Beverages',
                'pets': 'Pets',
                'uncategorized': 'Uncategorized',
            }
            category_id = get_category_id(supabase, cat_name_map.get(goods_cat, 'Uncategorized'))
        category_cache[goods_cat] = category_id
    
    is_uncategorized = goods_cat == 'uncategorized'
    if is_uncategorized:
        stats['uncategorized'] += 1
    
    # Get subcategory ID if we have one
    subcategory_id = None
    if goods_subcat and category_id:
        subcat_key = f"{goods_cat}:{goods_subcat}"
        if subcat_key in category_cache:
            subcategory_id = category_cache[subcat_key]
        else:
            cat_name_map = {
                'fruit_vegetables': 'Fruit & vegetables',
                'meat_seafood': 'Meat & seafood',
                'bakery_bread': 'Bakery & bread',
                'dairy_eggs': 'Dairy & eggs',
                'deli_prepared_food': 'Deli & prepared food',
                'everyday_essentials': 'Everyday essentials',
                'frozen_food': 'Frozen food',
                'health_beauty': 'Health & beauty',
                'baby_kids': 'Baby & kids',
                'pantry': 'Pantry',
                'beverages': 'Beverages',
                'pets': 'Pets',
            }
            parent_name = cat_name_map.get(goods_cat, goods_cat.replace('_', ' ').title())
            
            subcat_name_map = {
                'fruit': 'Fruit',
                'vegetables': 'Vegetables',
                'meat': 'Meat',
                'seafood': 'Seafood',
                'poultry': 'Poultry',
                'pork': 'Pork',
                'beef': 'Beef',
                'tofu_meat_alternatives': 'Tofu & meat alternatives',
                'bread': 'Bread',
                'tortillas': 'Tortillas',
                'desserts_pastries': 'Desserts & pastries',
                'cheese': 'Cheese',
                'milk': 'Milk',
                'yogurt': 'Yogurt',
                'eggs_egg_substitutes': 'Eggs & egg substitutes',
                'butter_margarine': 'Butter & margarine',
                'dip': 'Dip',
                'ready_meals_snacks': 'Ready meals & snacks',
                'baking_ingredients': 'Baking ingredients',
                'coffee': 'Coffee',
                'peanut_butter': 'Peanut butter',
                'sauces_marinades': 'Sauces & marinades',
                'international': 'International',
                'snacks_candy': 'Snacks & candy',
                'spices_seasonings': 'Spices & seasonings',
                'salsa_dip': 'Salsa & dip',
                'cereal_breakfast': 'Cereal & breakfast',
                'canned_dried_food': 'Canned & dried food',
                'jelly_jam': 'Jelly & jam',
                'dressing_oil_vinegar': 'Dressing, oil & vinegar',
                'pasta_rice': 'Pasta & rice',
                'soups_chili': 'Soups & chili',
                'broth_bouillon': 'Broth & bouillon',
                'juice': 'Juice',
                'soda': 'Soda',
                'water': 'Water',
                'ice_cream_treats': 'Ice cream & treats',
                'meals_sides': 'Meals & sides',
                'bread_baked_goods': 'Bread & baked goods',
                'diapers_potty': 'Diapers & potty',
                'food_formula': 'Food & formula',
                'dogs': 'Dogs',
                'cleaners': 'Cleaners',
                'laundry': 'Laundry',
                'paper_towels': 'Paper towels',
                'food_storage_wraps': 'Food storage & wraps',
                'trash_bags': 'Trash bags',
                'air_fresheners_candles': 'Air fresheners & candles',
                'cleaning_tools': 'Cleaning tools',
            }
            subcat_name = subcat_name_map.get(goods_subcat, goods_subcat.replace('_', ' ').title())
            subcategory_id = get_subcategory_id(supabase, subcat_name, parent_name)
            category_cache[subcat_key] = subcategory_id
    
    # Check for existing product by UPC
    existing_product = find_existing_product_by_upc(supabase, upc) if upc else None
    
    product_id = None
    
    if existing_product:
        # Merge with existing product
        product_id = existing_product['id']
        stats['matched_upc'] += 1
        
        # Update product with CM data if it adds value
        update_data = {}
        if not existing_product.get('category_id') and category_id:
            update_data['category_id'] = category_id
        if subcategory_id:
            update_data['subcategory_id'] = subcategory_id
            
        if update_data:
            try:
                supabase.table('products').update(update_data).eq('id', product_id).execute()
                stats['updated_products'] += 1
            except Exception as e:
                pass  # Ignore update errors
    else:
        # Create new product
        product_record = {
            'id': str(uuid4()),
            'name': product_data.get('name', '')[:500],
            'description': (product_data.get('description') or '')[:5000],
            'upc': upc if upc and len(upc) >= 6 else None,
            'brand': product_data.get('brand'),
            'image_url': product_data.get('image_url'),
            'category_id': category_id,
            'subcategory_id': subcategory_id,
            'unit_of_measure': product_data.get('sold_by'),
            'is_active': True,
            'needs_review': is_uncategorized,
            'raw_data': product_data.get('raw_data'),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        
        try:
            result = supabase.table('products').insert(product_record).execute()
            product_id = product_record['id']
            stats['new_products'] += 1
        except Exception as e:
            stats['errors'] += 1
            return None
    
    # Add product_store_mapping
    if product_id:
        try:
            mapping_record = {
                'product_id': product_id,
                'store_name': STORE_NAME,
                'store_item_id': external_id,
                'store_item_name': product_data.get('name', '')[:500],
                'store_image_url': product_data.get('image_url'),
                'is_active': product_data.get('is_available', True),
                'created_at': datetime.now(timezone.utc).isoformat(),
            }
            supabase.table('product_store_mappings').upsert(
                mapping_record, 
                on_conflict='product_id,store_name,store_item_id'
            ).execute()
            stats['store_mappings_added'] += 1
        except Exception as e:
            pass  # May already exist
    
    # Add product_pricing
    if product_id and product_data.get('cost_price'):
        try:
            pricing_record = {
                'product_id': product_id,
                'store_name': STORE_NAME,
                'location_id': product_data.get('store_id', '61'),
                'price': float(product_data.get('cost_price', 0)),
                'list_price': float(product_data.get('list_price')) if product_data.get('list_price') else None,
                'price_per_unit': float(product_data.get('price_per_unit')) if product_data.get('price_per_unit') else None,
                'price_per_unit_uom': product_data.get('price_per_unit_uom'),
                'is_on_sale': product_data.get('is_on_sale', False),
                'effective_from': datetime.now(timezone.utc).isoformat(),
            }
            supabase.table('product_pricing').insert(pricing_record).execute()
            stats['pricing_added'] += 1
        except Exception as e:
            pass  # May already exist
    
    return product_id


def import_central_market_products():
    """Main import function."""
    global stats
    
    # Load products
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'cm_products.json')
    print(f"Loading products from {json_path}...")
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    products = data.get('products', [])
    stats['total'] = len(products)
    print(f"Loaded {stats['total']} products")
    
    # Initialize Supabase
    supabase = get_client()
    print(f"Importing to store: {STORE_NAME}")
    
    # Category cache to avoid repeated lookups
    category_cache = {}
    
    # Process in batches
    batch_size = 100
    for i in range(0, len(products), batch_size):
        batch = products[i:i + batch_size]
        
        for product in batch:
            create_or_update_product(supabase, product, category_cache)
        
        # Progress update
        processed = min(i + batch_size, len(products))
        print(f"  Processed {processed}/{stats['total']} - "
              f"New: {stats['new_products']}, Matched: {stats['matched_upc']}, "
              f"Uncategorized: {stats['uncategorized']}, Errors: {stats['errors']}")
    
    # Final stats
    print("\n" + "=" * 50)
    print("IMPORT COMPLETE")
    print("=" * 50)
    print(f"Total products processed: {stats['total']}")
    print(f"New products created: {stats['new_products']}")
    print(f"Matched by UPC (merged): {stats['matched_upc']}")
    print(f"Products updated: {stats['updated_products']}")
    print(f"Store mappings added: {stats['store_mappings_added']}")
    print(f"Pricing records added: {stats['pricing_added']}")
    print(f"Uncategorized (needs review): {stats['uncategorized']}")
    print(f"Errors: {stats['errors']}")


if __name__ == '__main__':
    import_central_market_products()

