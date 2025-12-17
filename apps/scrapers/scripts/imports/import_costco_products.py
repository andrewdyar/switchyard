#!/usr/bin/env python3
"""
Import Costco products from Apify dataset to Supabase.

This script:
- Filters for warehouse-eligible items only (items with InWarehouse in categoryUrl)
- Creates/updates products in the products table
- Creates/updates product_store_mappings for Costco store
- Creates/updates categories
- Stores stock status in product_store_mappings
- Stores current price in product_pricing

IMPORTANT: The Apify dataset does not include location/warehouse-specific data.
This means:
- Stock status may vary by Costco warehouse location
- Prices may vary by region
- You should re-scrape with location-specific parameters for accurate inventory tracking

Usage:
    python3 import_costco_products.py <dataset_file.json> [--store-id <uuid>] [--store-name <name>]
    
    Options:
        --store-id: UUID of specific Costco store in stores table (optional)
        --store-name: Display name of Costco store (e.g., "Costco - Austin") (optional)
                     If not provided, uses generic "costco" store_name
"""

import json
import sys
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path

from supabase_client import get_client
from supabase_config import get_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CostcoProductImporter:
    """Import Costco products from Apify dataset to Supabase."""
    
    def __init__(self, store_id: Optional[str] = None, store_name: Optional[str] = None):
        """
        Initialize the importer with Supabase client.
        
        Args:
            store_id: UUID of specific Costco store in stores table (optional)
            store_name: Display name to use for store mapping (optional)
        """
        try:
            self.supabase = get_client()
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase: {e}")
            raise
        
        self.store_id = store_id
        self.store_name = store_name or 'costco'
        
        # Validate store_id if provided
        if self.store_id:
            try:
                result = self.supabase.table('stores').select('id, display_name').eq('id', self.store_id).limit(1).execute()
                if not result.data or len(result.data) == 0:
                    logger.warning(f"Store ID {self.store_id} not found in stores table, using generic store_name")
                    self.store_id = None
                else:
                    store_info = result.data[0]
                    logger.info(f"Using store: {store_info.get('display_name')} ({self.store_id})")
            except Exception as e:
                logger.warning(f"Error validating store_id: {e}, using generic store_name")
                self.store_id = None
        
        # Log location awareness
        if not self.store_id:
            logger.warning("=" * 60)
            logger.warning("WARNING: No specific store location provided!")
            logger.warning("This dataset appears to be location-agnostic.")
            logger.warning("Stock status and prices may vary by Costco warehouse location.")
            logger.warning("For accurate sweep planning, re-scrape with location-specific parameters.")
            logger.warning("=" * 60)
    
    def is_warehouse_eligible(self, item: Dict) -> bool:
        """
        Check if item is available for warehouse pickup.
        
        Costco items with 'InWarehouse' in categoryUrl are warehouse-eligible.
        Items without this are delivery-only and should be excluded.
        
        Args:
            item: Costco product item from Apify dataset
            
        Returns:
            True if item is warehouse-eligible, False otherwise
        """
        category_url = item.get('categoryUrl', '')
        return 'InWarehouse' in category_url
    
    def get_or_create_category(self, category_path: str, parent_id: Optional[str] = None) -> Optional[str]:
        """
        Get or create a category in the categories table.
        
        Args:
            category_path: Category path like "/snacks.html"
            parent_id: Parent category UUID if this is a subcategory
            
        Returns:
            Category UUID or None if creation failed
        """
        # Extract category name from path (e.g., "/snacks.html" -> "snacks")
        category_name = category_path.replace('.html', '').replace('/', '').replace('-', ' ').title()
        if not category_name:
            return None
        
        # Try to find existing category
        try:
            query = self.supabase.table('categories').select('id, name').eq('name', category_name)
            if parent_id:
                query = query.eq('parent_id', parent_id)
            else:
                query = query.is_('parent_id', 'null')
            
            result = query.limit(1).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]['id']
            
            # Create new category
            category_data = {
                'name': category_name,
                'source': 'costco',
                'level': 1 if not parent_id else 2
            }
            if parent_id:
                category_data['parent_id'] = parent_id
            
            result = self.supabase.table('categories').insert(category_data).execute()
            
            if result.data and len(result.data) > 0:
                logger.debug(f"Created category: {category_name}")
                return result.data[0]['id']
            
        except Exception as e:
            logger.warning(f"Failed to get/create category {category_name}: {e}")
        
        return None
    
    def get_category_ids(self, item: Dict) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract category and subcategory IDs from Costco item.
        
        Args:
            item: Costco product item
            
        Returns:
            Tuple of (category_id, subcategory_id)
        """
        category_paths = item.get('categoryPaths', [])
        if not category_paths:
            return None, None
        
        # Last path is usually the most specific (subcategory)
        # Second-to-last is usually the main category
        category_id = None
        subcategory_id = None
        
        # Process paths in reverse to find most specific category
        paths = [p for p in category_paths if p and p != '/'][-2:]  # Get last 2 paths
        
        if len(paths) >= 2:
            # Create parent category
            category_id = self.get_or_create_category(paths[0])
            # Create subcategory with parent
            subcategory_id = self.get_or_create_category(paths[1], category_id)
        elif len(paths) == 1:
            # Only one category
            category_id = self.get_or_create_category(paths[0])
        
        return category_id, subcategory_id
    
    def extract_upc(self, item: Dict) -> Optional[str]:
        """
        Extract UPC from manufacturingSkus.
        
        Args:
            item: Costco product item
            
        Returns:
            UPC string or None
        """
        manufacturing_skus = item.get('manufacturingSkus', [])
        if manufacturing_skus and len(manufacturing_skus) > 0:
            # Use first UPC if available
            upc = manufacturing_skus[0].strip()
            if upc:
                return upc
        return None
    
    def get_or_create_product(self, item: Dict) -> Optional[str]:
        """
        Get or create product in products table.
        
        Args:
            item: Costco product item
            
        Returns:
            Product UUID or None if creation failed
        """
        upc = self.extract_upc(item)
        name = item.get('name', '').strip() or item.get('itemName', '').strip()
        
        if not name:
            logger.warning(f"Item {item.get('itemNumber')} has no name, skipping")
            return None
        
        # Try to find existing product by UPC
        product_id = None
        if upc:
            try:
                result = self.supabase.table('products').select('id').eq('upc', upc).limit(1).execute()
                if result.data and len(result.data) > 0:
                    product_id = result.data[0]['id']
                    logger.debug(f"Found existing product by UPC: {upc}")
            except Exception as e:
                logger.debug(f"Error looking up product by UPC: {e}")
        
        # If not found, try by name
        if not product_id:
            try:
                result = self.supabase.table('products').select('id').eq('name', name).limit(1).execute()
                if result.data and len(result.data) > 0:
                    product_id = result.data[0]['id']
                    logger.debug(f"Found existing product by name: {name}")
            except Exception as e:
                logger.debug(f"Error looking up product by name: {e}")
        
        # Get category IDs
        category_id, subcategory_id = self.get_category_ids(item)
        
        # Prepare product data
        product_data = {
            'name': name,
            'description': item.get('description', '').strip() or None,
            'image_url': item.get('image', '') or item.get('images', [None])[0] or None,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if upc:
            product_data['upc'] = upc
        if category_id:
            product_data['category_id'] = category_id
        if subcategory_id:
            product_data['subcategory_id'] = subcategory_id
        
        # Get unit of measure from containerSizes or quantityAttr
        container_sizes = item.get('containerSizes', [])
        quantity_attr = item.get('quantityAttr', [])
        if container_sizes:
            # Try to extract unit from container size (e.g., "1 oz." -> "oz")
            size_str = container_sizes[0].lower()
            if 'oz' in size_str or 'ounce' in size_str:
                product_data['unit_of_measure'] = 'oz'
            elif 'lb' in size_str or 'pound' in size_str:
                product_data['unit_of_measure'] = 'lb'
            elif 'count' in size_str or 'ct' in size_str:
                product_data['unit_of_measure'] = 'each'
        
        if product_id:
            # Update existing product
            try:
                result = self.supabase.table('products').update(product_data).eq('id', product_id).execute()
                if result.data:
                    logger.debug(f"Updated product: {name}")
                    return product_id
            except Exception as e:
                logger.error(f"Failed to update product {name}: {e}")
                return None
        else:
            # Create new product
            try:
                result = self.supabase.table('products').insert(product_data).execute()
                if result.data and len(result.data) > 0:
                    product_id = result.data[0]['id']
                    logger.info(f"Created product: {name}")
                    return product_id
            except Exception as e:
                logger.error(f"Failed to create product {name}: {e}")
                return None
        
        return None
    
    def upsert_store_mapping(self, product_id: str, item: Dict) -> bool:
        """
        Create or update product_store_mappings entry for Costco.
        
        Note: Without location-specific data, stock status may not be accurate
        for all Costco warehouse locations.
        
        Args:
            product_id: Product UUID
            item: Costco product item
            
        Returns:
            True if successful, False otherwise
        """
        store_item_id = item.get('itemNumber', '') or item.get('groupId', '')
        if not store_item_id:
            logger.warning(f"Item has no itemNumber or groupId, skipping store mapping")
            return False
        
        store_item_name = item.get('itemName', '').strip() or item.get('name', '').strip()
        store_image_url = item.get('image', '') or (item.get('images', [None])[0] if item.get('images') else None)
        
        # Get stock status (WARNING: This may not be location-specific)
        stock_status = item.get('stockStatus', '') or item.get('availabilityStatus', '') or None
        if stock_status:
            # Normalize stock status
            stock_status = stock_status.lower().strip()
            # Add note if no location specified
            if not self.store_id:
                logger.debug(f"Stock status '{stock_status}' may vary by warehouse location")
        
        # Check if mapping exists
        try:
            query = self.supabase.table('product_store_mappings').select('id').eq(
                'product_id', product_id
            ).eq('store_name', self.store_name).eq('store_item_id', store_item_id)
            
            result = query.limit(1).execute()
            
            mapping_data = {
                'store_item_name': store_item_name,
                'store_image_url': store_image_url,
                'stock_status': stock_status,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if result.data and len(result.data) > 0:
                # Update existing mapping
                mapping_id = result.data[0]['id']
                self.supabase.table('product_store_mappings').update(mapping_data).eq('id', mapping_id).execute()
                logger.debug(f"Updated {self.store_name} mapping for item {store_item_id}")
            else:
                # Create new mapping
                mapping_data.update({
                    'product_id': product_id,
                    'store_name': self.store_name,
                    'store_item_id': store_item_id,
                    'is_active': True
                })
                self.supabase.table('product_store_mappings').insert(mapping_data).execute()
                logger.debug(f"Created {self.store_name} mapping for item {store_item_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert store mapping for item {store_item_id}: {e}")
            return False
    
    def upsert_price(self, product_id: str, item: Dict) -> bool:
        """
        Create or update current price in product_pricing table.
        
        Args:
            product_id: Product UUID
            item: Costco product item
            
        Returns:
            True if successful, False otherwise
        """
        # Get price (use listPrice or pricePerUnit)
        price = item.get('listPrice') or item.get('pricePerUnit') or item.get('minPrice')
        if not price or price <= 0:
            logger.debug(f"No valid price for item {item.get('itemNumber')}")
            return False
        
        try:
            # Check if there's an active price (effective_to IS NULL)
            result = self.supabase.table('product_pricing').select('id, price').eq(
                'product_id', product_id
            ).is_('effective_to', 'null').order('effective_from', desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                existing_price = float(result.data[0]['price'])
                # Only update if price changed
                if abs(existing_price - float(price)) > 0.01:
                    # Close old price
                    old_id = result.data[0]['id']
                    self.supabase.table('product_pricing').update({
                        'effective_to': datetime.utcnow().isoformat()
                    }).eq('id', old_id).execute()
                    
                    # Create new price
                    self.supabase.table('product_pricing').insert({
                        'product_id': product_id,
                        'price': float(price),
                        'effective_from': datetime.utcnow().isoformat()
                    }).execute()
                    logger.debug(f"Updated price for product {product_id}: ${price}")
            else:
                # Create new price
                self.supabase.table('product_pricing').insert({
                    'product_id': product_id,
                    'price': float(price),
                    'effective_from': datetime.utcnow().isoformat()
                }).execute()
                logger.debug(f"Created price for product {product_id}: ${price}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert price for product {product_id}: {e}")
            return False
    
    def import_item(self, item: Dict) -> Tuple[bool, str]:
        """
        Import a single Costco item.
        
        Args:
            item: Costco product item from Apify dataset
            
        Returns:
            Tuple of (success, message)
        """
        item_number = item.get('itemNumber', 'unknown')
        
        # Check if warehouse-eligible
        if not self.is_warehouse_eligible(item):
            return False, f"Item {item_number} is delivery-only, skipping"
        
        # Get or create product
        product_id = self.get_or_create_product(item)
        if not product_id:
            return False, f"Failed to get/create product for item {item_number}"
        
        # Create/update store mapping
        mapping_success = self.upsert_store_mapping(product_id, item)
        if not mapping_success:
            return False, f"Failed to create store mapping for item {item_number}"
        
        # Create/update price
        price_success = self.upsert_price(product_id, item)
        if not price_success:
            logger.warning(f"Failed to upsert price for item {item_number}, but continuing")
        
        return True, f"Successfully imported item {item_number}"
    
    def import_from_file(self, file_path: str) -> Dict[str, int]:
        """
        Import all Costco products from JSON file.
        
        Args:
            file_path: Path to JSON file containing Costco products
            
        Returns:
            Dictionary with import statistics
        """
        logger.info(f"Loading products from {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            items = json.load(f)
        
        logger.info(f"Loaded {len(items)} items from dataset")
        
        stats = {
            'total': len(items),
            'warehouse_eligible': 0,
            'delivery_only': 0,
            'imported': 0,
            'failed': 0,
            'errors': []
        }
        
        for i, item in enumerate(items, 1):
            if not self.is_warehouse_eligible(item):
                stats['delivery_only'] += 1
                logger.debug(f"[{i}/{len(items)}] Skipping delivery-only item: {item.get('itemNumber')}")
                continue
            
            stats['warehouse_eligible'] += 1
            logger.info(f"[{i}/{len(items)}] Processing: {item.get('name', 'Unknown')[:50]}")
            
            success, message = self.import_item(item)
            if success:
                stats['imported'] += 1
            else:
                stats['failed'] += 1
                stats['errors'].append(message)
                logger.error(f"  {message}")
        
        return stats


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Import Costco products from Apify dataset to Supabase')
    parser.add_argument('dataset_file', help='Path to JSON file containing Costco products')
    parser.add_argument('--store-id', help='UUID of specific Costco store in stores table')
    parser.add_argument('--store-name', help='Display name for store mapping (e.g., "Costco - Austin")')
    
    args = parser.parse_args()
    
    file_path = args.dataset_file
    if not Path(file_path).exists():
        logger.error(f"File not found: {file_path}")
        sys.exit(1)
    
    importer = CostcoProductImporter(store_id=args.store_id, store_name=args.store_name)
    stats = importer.import_from_file(file_path)
    
    logger.info("=" * 60)
    logger.info("Import Complete!")
    logger.info("=" * 60)
    logger.info(f"Total items: {stats['total']}")
    logger.info(f"Warehouse-eligible: {stats['warehouse_eligible']}")
    logger.info(f"Delivery-only (skipped): {stats['delivery_only']}")
    logger.info(f"Successfully imported: {stats['imported']}")
    logger.info(f"Failed: {stats['failed']}")
    
    if stats['errors']:
        logger.warning(f"\nFirst 10 errors:")
        for error in stats['errors'][:10]:
            logger.warning(f"  - {error}")


if __name__ == '__main__':
    main()

