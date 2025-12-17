#!/usr/bin/env python3
"""
Migration script to fix category_id for HEB products with subcategory_id.
For all HEB products that have a subcategory_id, traverses up the category
hierarchy to find the Level 1 parent category (where level=1 and source='goods')
and sets category_id to that parent.
"""

import sys
from supabase_client import get_client
from supabase_config import SupabaseConfig
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def find_level1_parent(client, subcategory_id):
    """
    Traverse up the category hierarchy to find the Level 1 parent category.
    Returns the UUID of the Level 1 category, or None if not found.
    """
    current_id = subcategory_id
    visited = set()  # Prevent infinite loops
    
    while current_id and current_id not in visited:
        visited.add(current_id)
        
        # Get the current category
        category_response = client.table('categories').select('id,parent_id,level,source').eq('id', current_id).execute()
        
        if not category_response.data:
            logger.warning(f"Category {current_id} not found")
            return None
        
        category = category_response.data[0]
        
        # If this is a Level 1 category with source='goods', we found it!
        if category.get('level') == 1 and category.get('source') == 'goods':
            return category['id']
        
        # Move up to parent
        parent_id = category.get('parent_id')
        if not parent_id:
            # Reached the top but didn't find a Level 1 with source='goods'
            logger.warning(f"Reached top of hierarchy for {subcategory_id} without finding Level 1 goods category")
            return None
        
        current_id = parent_id
    
    logger.warning(f"Circular reference detected in category hierarchy for {subcategory_id}")
    return None

def run_migration():
    """Execute the migration to fix category_id for HEB products."""
    try:
        client = get_client()
        config = SupabaseConfig()
        
        logger.info("Starting migration to fix category_id for HEB products...")
        
        # Step 1: Get all HEB products with subcategory_id
        logger.info("Fetching HEB products with subcategory_id...")
        
        # First, get all product IDs that are linked to HEB
        heb_products_response = client.table('product_store_mappings').select('product_id').eq('store_name', 'heb').execute()
        heb_product_ids = [m['product_id'] for m in heb_products_response.data] if heb_products_response.data else []
        
        if not heb_product_ids:
            logger.warning("No HEB products found")
            return
        
        logger.info(f"Found {len(heb_product_ids)} HEB products")
        
        # Get products with subcategory_id in batches (smaller batches to avoid URL length issues)
        batch_size = 100
        updated_count = 0
        not_found_count = 0
        error_count = 0
        
        for i in range(0, len(heb_product_ids), batch_size):
            batch_ids = heb_product_ids[i:i+batch_size]
            
            # Get products with subcategory_id
            try:
                products_response = client.table('products').select('id,subcategory_id,category_id').in_('id', batch_ids).not_.is_('subcategory_id', 'null').execute()
            except Exception as e:
                logger.error(f"Error fetching batch {i//batch_size + 1}: {e}")
                continue
            
            if not products_response.data:
                continue
            
            logger.info(f"Processing batch {i//batch_size + 1} ({len(products_response.data)} products with subcategory_id)...")
            
            for product in products_response.data:
                product_id = product['id']
                subcategory_id = product['subcategory_id']
                
                # Verify the subcategory is a 'goods' category
                subcategory_check = client.table('categories').select('source').eq('id', subcategory_id).execute()
                if not subcategory_check.data or subcategory_check.data[0].get('source') != 'goods':
                    continue
                
                # Find the Level 1 parent
                level1_category_id = find_level1_parent(client, subcategory_id)
                
                if level1_category_id:
                    # Update the product's category_id
                    try:
                        client.table('products').update({
                            'category_id': level1_category_id,
                            'updated_at': 'now()'
                        }).eq('id', product_id).execute()
                        
                        updated_count += 1
                        
                        if updated_count % 1000 == 0:
                            logger.info(f"Updated {updated_count} products so far...")
                    except Exception as e:
                        logger.error(f"Error updating product {product_id}: {e}")
                        error_count += 1
                else:
                    not_found_count += 1
                    if not_found_count <= 10:  # Only log first 10
                        logger.warning(f"Could not find Level 1 parent for product {product_id} with subcategory_id {subcategory_id}")
        
        logger.info("=" * 60)
        logger.info("Migration complete!")
        logger.info(f"  ✅ Updated: {updated_count} products")
        logger.info(f"  ⚠️  Level 1 parent not found: {not_found_count} products")
        logger.info(f"  ❌ Errors: {error_count} products")
        logger.info("=" * 60)
        
        # Step 2: Verify results
        logger.info("\nVerifying results...")
        verification_response = client.table('products').select('category_id,categories!inner(level)').in_('id', heb_product_ids[:100]).not_.is_('category_id', 'null').execute()
        
        if verification_response.data:
            level_counts = {}
            for item in verification_response.data:
                if item.get('categories'):
                    level = item['categories'][0].get('level') if isinstance(item['categories'], list) else item['categories'].get('level')
                    level_counts[level] = level_counts.get(level, 0) + 1
            
            logger.info("Sample verification (first 100 products):")
            for level, count in sorted(level_counts.items()):
                logger.info(f"  Level {level}: {count} products")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    run_migration()

