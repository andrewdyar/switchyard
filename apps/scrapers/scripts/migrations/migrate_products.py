"""
Migrate products from products_data.py to normalized Supabase structure.

This script:
1. Creates master product records
2. Maps store-specific SKUs via product_store_mappings
3. Creates initial pricing records
4. Creates basic categories if they don't exist

Usage:
    python migrate_products.py
"""

import os
import sys
from typing import Dict, List, Optional
from collections import defaultdict
from supabase_client import get_client, SupabaseService
from products_data import PRODUCTS_DATA
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def normalize_product_name(name: str) -> str:
    """Normalize product name by removing store-specific prefixes."""
    # Remove common store prefixes
    prefixes = ['H-E-B ', 'Hill Country Fare ', 'Great Value ', 'bettergoods ']
    for prefix in prefixes:
        if name.startswith(prefix):
            name = name[len(prefix):]
    return name.strip()


def group_products_by_name(products: List[Dict]) -> Dict[str, List[Dict]]:
    """Group products by normalized name to find duplicates across stores."""
    grouped = defaultdict(list)
    for product in products:
        normalized = normalize_product_name(product['name'])
        grouped[normalized].append(product)
    return grouped


def get_or_create_category(
    service: SupabaseService,
    category_name: str,
    parent_id: Optional[str] = None,
    source: str = 'manual'
) -> str:
    """Get or create a category, return its ID."""
    # Try to find existing category
    filters = {'name': category_name}
    if parent_id is None:
        # Query for NULL parent_id using is.null
        filters['parent_id'] = None  # Will be handled by supabase_client
    else:
        filters['parent_id'] = parent_id
    
    existing = service.select(
        'categories',
        columns='id',
        filters=filters
    )
    
    if existing:
        return existing[0]['id']
    
    # Create new category
    level = 1 if parent_id is None else 2
    new_category = service.insert('categories', {
        'name': category_name,
        'parent_id': parent_id,
        'source': source,
        'level': level
    })
    
    return new_category[0]['id']


def get_or_create_store(
    service: SupabaseService,
    store_name: str,
    display_name: str
) -> str:
    """Get or create a store, return its ID."""
    existing = service.select('stores', columns='id', filters={'name': store_name})
    
    if existing:
        return existing[0]['id']
    
    new_store = service.insert('stores', {
        'name': store_name,
        'display_name': display_name,
        'is_active': True
    })
    
    return new_store[0]['id']


def migrate_products():
    """Main migration function."""
    try:
        # Get Supabase client
        client = get_client()
        service = SupabaseService()
        
        logger.info("Starting product migration...")
        
        # Create basic categories (we'll use generic ones for now)
        # In production, these should come from HEB/Walmart APIs
        categories_map = {}
        categories_map['produce'] = get_or_create_category(service, 'Produce', source='manual')
        categories_map['meat'] = get_or_create_category(service, 'Meat & Seafood', source='manual')
        categories_map['dairy'] = get_or_create_category(service, 'Dairy', source='manual')
        categories_map['pantry'] = get_or_create_category(service, 'Pantry', source='manual')
        categories_map['frozen'] = get_or_create_category(service, 'Frozen', source='manual')
        categories_map['bakery'] = get_or_create_category(service, 'Bakery', source='manual')
        categories_map['household'] = get_or_create_category(service, 'Household', source='manual')
        categories_map['snacks'] = get_or_create_category(service, 'Snacks', source='manual')
        categories_map['beverages'] = get_or_create_category(service, 'Beverages', source='manual')
        
        # Create stores
        stores_map = {}
        stores_map['heb'] = get_or_create_store(service, 'heb', 'HEB')
        stores_map['walmart'] = get_or_create_store(service, 'walmart', 'Walmart')
        
        # Group products by normalized name
        grouped_products = group_products_by_name(PRODUCTS_DATA)
        
        logger.info(f"Found {len(grouped_products)} unique products across {len(PRODUCTS_DATA)} store-specific items")
        
        # Track created products
        created_count = 0
        mapping_count = 0
        pricing_count = 0
        
        # Create products and mappings
        for normalized_name, store_products in grouped_products.items():
            # Use first product's name and image as master
            master_product = store_products[0]
            master_name = normalized_name
            master_image = master_product.get('image', '')
            
            # Determine category (simple heuristic - could be improved)
            category_id = None
            name_lower = master_name.lower()
            if any(word in name_lower for word in ['fresh', 'organic', 'basil', 'onion', 'pepper', 'garlic', 'cilantro', 'parsley', 'celery']):
                category_id = categories_map.get('produce')
            elif any(word in name_lower for word in ['chicken', 'beef', 'pork', 'bacon', 'meat']):
                category_id = categories_map.get('meat')
            elif any(word in name_lower for word in ['cheese', 'cream', 'milk', 'eggs', 'butter', 'sour cream']):
                category_id = categories_map.get('dairy')
            elif any(word in name_lower for word in ['frozen', 'ice']):
                category_id = categories_map.get('frozen')
            elif any(word in name_lower for word in ['bread', 'buns', 'biscuit', 'tortilla', 'biscuit']):
                category_id = categories_map.get('bakery')
            elif any(word in name_lower for word in ['paper', 'disposable']):
                category_id = categories_map.get('household')
            elif any(word in name_lower for word in ['cereal', 'cookies', 'pretzel', 'wafer']):
                category_id = categories_map.get('snacks')
            elif any(word in name_lower for word in ['soda', 'drink']):
                category_id = categories_map.get('beverages')
            else:
                category_id = categories_map.get('pantry')
            
            # Check if product already exists (by normalized name)
            existing = service.select('products', columns='id', filters={'name': master_name})
            
            if existing:
                product_id = existing[0]['id']
                logger.debug(f"Product already exists: {master_name}")
            else:
                # Create master product
                new_product = service.insert('products', {
                    'name': master_name,
                    'description': None,
                    'image_url': master_image,
                    'category_id': category_id,
                    'unit_of_measure': 'each'
                })
                product_id = new_product[0]['id']
                created_count += 1
                logger.info(f"Created product: {master_name} (ID: {product_id})")
            
            # Create store mappings and pricing for each store variant
            for store_product in store_products:
                store_name = store_product.get('store', 'heb')
                store_item_id = store_product.get('id')
                store_item_name = store_product.get('name')
                store_image = store_product.get('image', '')
                price = store_product.get('price', 0)
                
                # Check if mapping already exists
                existing_mapping = service.select(
                    'product_store_mappings',
                    columns='id',
                    filters={
                        'product_id': product_id,
                        'store_name': store_name,
                        'store_item_id': store_item_id
                    }
                )
                
                if not existing_mapping:
                    # Create store mapping
                    service.insert('product_store_mappings', {
                        'product_id': product_id,
                        'store_name': store_name,
                        'store_item_id': store_item_id,
                        'store_item_name': store_item_name,
                        'store_image_url': store_image,
                        'is_active': True
                    })
                    mapping_count += 1
                    logger.debug(f"  Created mapping: {store_name} - {store_item_id}")
                
                # Create pricing record (if not exists)
                existing_pricing = service.select(
                    'product_pricing',
                    columns='id',
                    filters={'product_id': product_id},
                    limit=1
                )
                
                if not existing_pricing:
                    # Create initial pricing (use first price found, or average)
                    service.insert('product_pricing', {
                        'product_id': product_id,
                        'price': price,
                        'effective_from': 'now()',
                        'effective_to': None
                    })
                    pricing_count += 1
                    logger.debug(f"  Created pricing: ${price}")
        
        logger.info("=" * 50)
        logger.info("Migration completed!")
        logger.info(f"  Created {created_count} master products")
        logger.info(f"  Created {mapping_count} store mappings")
        logger.info(f"  Created {pricing_count} pricing records")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    migrate_products()

