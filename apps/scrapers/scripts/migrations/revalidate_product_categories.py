"""
Re-validate and update product categories to match Goods taxonomy.

This script:
1. Identifies products with non-goods categories
2. Maps them to correct Goods categories based on their current category names
3. Updates Supabase with correct category_id and subcategory_id
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env'))

from app.supabase_client import get_client
from core.category_lookup import get_category_id, get_subcategory_id


def get_goods_category_ids(supabase):
    """Get all Goods category IDs."""
    result = supabase.table('categories').select('id').eq('source', 'goods').eq('level', 1).execute()
    return {r['id'] for r in result.data}


def build_category_lookup(supabase):
    """Build lookup from old category names to new Goods category IDs."""
    # Get all non-goods categories with their names
    result = supabase.table('categories').select('id, name, source').execute()
    
    # Map old category names to Goods category names
    category_mappings = {
        # Pantry-related
        'Pantry': 'Pantry',
        'Canned Goods': 'Pantry',
        'Baking': 'Pantry',
        'Spreads': 'Pantry',
        'Condiments Sauces': 'Pantry',
        'Soup': 'Pantry',
        'Beans Grains Rice': 'Pantry',
        'Oils Balsamic': 'Pantry',
        'Spices Seasonings': 'Pantry',
        
        # Snacks -> Pantry
        'Snacks': 'Pantry',
        'Snacks Bars': 'Pantry',
        'Chips Pretzels': 'Pantry',
        'Crackers': 'Pantry',
        'Cookies': 'Pantry',
        'Nuts': 'Pantry',
        'Dried Fruit': 'Pantry',
        'Trail Snack Mix': 'Pantry',
        'Jerky': 'Pantry',
        'Chocolates': 'Pantry',
        'Candy': 'Pantry',
        'Hard Gummy Candy': 'Pantry',
        
        # Beverages
        'Beverages': 'Beverages',
        'Coffee Sweeteners': 'Beverages',
        'Single Serve Coffee': 'Beverages',
        'Ground Coffee': 'Beverages',
        'Soft Drinks': 'Beverages',
        'Juice': 'Beverages',
        'Bottled Water': 'Beverages',
        
        # Dairy & eggs
        'Milk': 'Dairy & eggs',
        'Cheese': 'Dairy & eggs',
        'Dairy Eggs Cheese': 'Dairy & eggs',
        
        # Frozen
        'Frozen Meat Seafood': 'Frozen food',
        'Cold Frozen Grocery': 'Frozen food',
        'Frozen Meals': 'Frozen food',
        
        # Household/Everyday
        'Laundry Supplies': 'Everyday essentials',
        'Household Cleaning': 'Everyday essentials',
        'Dish Detergent': 'Everyday essentials',
        'Trash Bags': 'Everyday essentials',
        'Cleaning Supplies': 'Everyday essentials',
        'Disposable Dinnerware': 'Everyday essentials',
        'Food Wrap': 'Everyday essentials',
        'Food Storage': 'Everyday essentials',
        'Paper Products Food Storage': 'Everyday essentials',
        'Paper Towels Napkins': 'Everyday essentials',
        'Facial Tissue': 'Everyday essentials',
        
        # Health & beauty
        'Personal Care': 'Health & beauty',
        'Oral Care': 'Health & beauty',
        'Toothpaste Mouthwash Gum Care': 'Health & beauty',
        'All Costco Grocery': 'Health & beauty',  # Fallback for misc
        'Grocery Health Beauty': 'Health & beauty',
        
        # Meat & seafood
        'Hot Dogs Bacon Sausage': 'Meat & seafood',
        
        # Deli
        'Deli': 'Deli & prepared food',
        
        # Produce
        'Produce': 'Fruit & vegetables',
        'Fresh Fruit': 'Fruit & vegetables',
        'Fresh Vegetables': 'Fruit & vegetables',
        
        # General fallbacks
        'Grocery Household': 'Pantry',
        'Kirkland Signature Groceries': 'Pantry',
        'Breakfast': 'Pantry',
        'Breakfast Cereal': 'Pantry',
        'Canned Meats': 'Pantry',
        'Electronics': 'Uncategorized',  # Non-grocery
        'Household': 'Everyday essentials',
    }
    
    # Build lookup from old category ID to new goods category name
    old_to_new = {}
    for cat in result.data:
        if cat['source'] != 'goods':
            # Find mapping
            if cat['name'] in category_mappings:
                old_to_new[cat['id']] = category_mappings[cat['name']]
    
    return old_to_new


def revalidate_products():
    """Re-validate products with non-goods categories."""
    supabase = get_client()
    
    # Get all Goods category IDs
    goods_category_ids = get_goods_category_ids(supabase)
    print(f"Found {len(goods_category_ids)} Goods top-level categories")
    
    # Build lookup for old categories
    old_to_new = build_category_lookup(supabase)
    print(f"Built mapping for {len(old_to_new)} old category IDs")
    
    # Get uncategorized category ID
    uncategorized_id = get_category_id(supabase, 'Uncategorized')
    print(f"Uncategorized category ID: {uncategorized_id}")
    
    # Process products in batches
    batch_size = 1000
    offset = 0
    total_updated = 0
    total_uncategorized = 0
    
    while True:
        # Get batch of products
        result = supabase.table('products').select(
            'id, name, category_id'
        ).range(offset, offset + batch_size - 1).execute()
        
        if not result.data:
            break
            
        products_to_update = []
        
        for product in result.data:
            cat_id = product['category_id']
            
            # Skip if already has goods category
            if cat_id in goods_category_ids:
                continue
            
            # Skip if NULL (handled separately)
            if cat_id is None:
                continue
                
            # Look up mapping
            if cat_id in old_to_new:
                new_goods_cat_name = old_to_new[cat_id]
                new_category_id = get_category_id(supabase, new_goods_cat_name)
                
                if new_category_id:
                    products_to_update.append({
                        'id': product['id'],
                        'category_id': new_category_id,
                        'needs_review': new_goods_cat_name == 'Uncategorized'
                    })
                    if new_goods_cat_name == 'Uncategorized':
                        total_uncategorized += 1
            else:
                # No mapping found, assign to uncategorized
                products_to_update.append({
                    'id': product['id'],
                    'category_id': uncategorized_id,
                    'needs_review': True
                })
                total_uncategorized += 1
        
        # Update products
        for update_data in products_to_update:
            try:
                supabase.table('products').update({
                    'category_id': update_data['category_id'],
                    'needs_review': update_data['needs_review']
                }).eq('id', update_data['id']).execute()
                total_updated += 1
            except Exception as e:
                print(f"  Error updating {update_data['id']}: {e}")
        
        print(f"  Processed {offset + len(result.data)} products, updated {len(products_to_update)}")
        
        if len(result.data) < batch_size:
            break
            
        offset += batch_size
    
    print(f"\nTotal updated: {total_updated}")
    print(f"Total uncategorized: {total_uncategorized}")
    
    # Handle products with NULL category_id
    null_result = supabase.table('products').select(
        'id, name'
    ).is_('category_id', 'null').execute()
    
    print(f"\nFound {len(null_result.data)} products with NULL category_id")
    
    null_updated = 0
    for product in null_result.data:
        try:
            supabase.table('products').update({
                'category_id': uncategorized_id,
                'needs_review': True
            }).eq('id', product['id']).execute()
            null_updated += 1
        except Exception as e:
            print(f"  Error updating {product['id']}: {e}")
    
    print(f"Updated {null_updated} NULL category products")


if __name__ == '__main__':
    revalidate_products()
