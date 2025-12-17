#!/usr/bin/env python3
"""
Import Costco products from Fusion API response (location-specific).

This script:
- Parses Costco Fusion API response from dev tools
- Extracts location-specific inventory (item_location_locationNumber)
- Creates/updates products in the products table
- Creates/updates product_store_mappings for specific Costco warehouse
- Stores location-specific stock status and pricing
- Removes/deactivates items not in the current location inventory

Usage:
    python3 import_costco_fusion_api.py <fusion_api_response.json> [--location-number <location>]
    
    Example:
        python3 import_costco_fusion_api.py costco_fusion_response.json --location-number 681-wh
"""

import json
import sys
import logging
import argparse
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime
from pathlib import Path

from supabase_client import get_client
from supabase_config import get_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CostcoFusionAPIImporter:
    """Import Costco products from Fusion API response (location-specific)."""
    
    def __init__(self, location_number: Optional[str] = None):
        """
        Initialize the importer with Supabase client.
        
        Args:
            location_number: Costco warehouse location number (e.g., "681-wh")
        """
        try:
            self.supabase = get_client()
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase: {e}")
            raise
        
        self.location_number = location_number
        self.store_name = f"costco-{location_number}" if location_number else "costco"
        
        if location_number:
            logger.info(f"Importing for Costco warehouse location: {location_number}")
            logger.info(f"Store mapping name: {self.store_name}")
        else:
            logger.warning("No location number provided - using generic 'costco'")
    
    def get_or_create_category(self, category_path: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Get or create a category in the categories table."""
        # Extract category name from path (e.g., "/snacks.html" -> "snacks")
        category_name = category_path.replace('.html', '').replace('/', '').replace('-', ' ').title()
        if not category_name:
            return None
        
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
        """Extract category and subcategory IDs from Costco item."""
        category_paths = item.get('categoryPath_ss', [])
        if not category_paths:
            return None, None
        
        category_id = None
        subcategory_id = None
        
        # Process paths in reverse to find most specific category
        paths = [p for p in category_paths if p and p != '/'][-2:]  # Get last 2 paths
        
        if len(paths) >= 2:
            category_id = self.get_or_create_category(paths[0])
            subcategory_id = self.get_or_create_category(paths[1], category_id)
        elif len(paths) == 1:
            category_id = self.get_or_create_category(paths[0])
        
        return category_id, subcategory_id
    
    def extract_upc(self, item: Dict) -> Optional[str]:
        """Extract UPC from item_manufacturing_skus."""
        manufacturing_skus = item.get('item_manufacturing_skus', [])
        if manufacturing_skus and len(manufacturing_skus) > 0:
            upc = str(manufacturing_skus[0]).strip()
            if upc:
                return upc
        return None
    
    def get_or_create_product(self, item: Dict) -> Optional[str]:
        """Get or create product in products table."""
        upc = self.extract_upc(item)
        name = item.get('item_product_name', '').strip() or item.get('item_name', '').strip() or item.get('name', '').strip()
        
        if not name:
            logger.warning(f"Item {item.get('item_number', 'unknown')} has no name, skipping")
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
            'description': item.get('item_short_description', '').strip() or item.get('description', '').strip() or None,
            'image_url': item.get('item_collateral_primaryimage') or item.get('image') or None,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if upc:
            product_data['upc'] = upc
        if category_id:
            product_data['category_id'] = category_id
        if subcategory_id:
            product_data['subcategory_id'] = subcategory_id
        
        # Get unit of measure from Container_Size_attr
        container_sizes = item.get('Container_Size_attr', [])
        if container_sizes:
            size_str = str(container_sizes[0]).lower()
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
        """Create or update product_store_mappings entry with location-specific data."""
        store_item_id = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', ''))
        if not store_item_id:
            logger.warning(f"Item has no item_number, skipping store mapping")
            return False
        
        store_item_name = item.get('item_product_name', '').strip() or item.get('item_name', '').strip() or item.get('name', '').strip()
        store_image_url = item.get('item_collateral_primaryimage') or item.get('image') or None
        
        # Get location-specific stock status
        stock_status = item.get('item_location_stockStatus', '') or item.get('item_location_availability', '') or item.get('inWarehouseStatus', '')
        if stock_status:
            stock_status = stock_status.lower().strip()
        
        # Set Costco brand logo URL from Supabase Storage
        # This URL is cached and publicly accessible
        brand_logo_url = 'https://epwngkevdzaehiivtzpd.supabase.co/storage/v1/object/public/brand-logos/costco/logo.png'
        
        try:
            # Check if mapping exists for this location
            query = self.supabase.table('product_store_mappings').select('id').eq(
                'product_id', product_id
            ).eq('store_name', self.store_name).eq('store_item_id', store_item_id)
            
            result = query.limit(1).execute()
            
            mapping_data = {
                'store_item_name': store_item_name,
                'store_image_url': store_image_url,
                'stock_status': stock_status,
                'brand_logo_url': brand_logo_url,
                'is_active': True,  # Activate items that are in current inventory
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
                })
                self.supabase.table('product_store_mappings').insert(mapping_data).execute()
                logger.debug(f"Created {self.store_name} mapping for item {store_item_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert store mapping for item {store_item_id}: {e}")
            return False
    
    def upsert_price(self, product_id: str, item: Dict) -> bool:
        """Create or update current price in product_pricing table with location-specific pricing."""
        # Get location-specific price
        price = item.get('item_location_pricing_salePrice') or item.get('item_location_pricing_listPrice') or item.get('item_location_pricing_pricePerUnit_price')
        if not price or price <= 0:
            logger.debug(f"No valid price for item {item.get('item_number')}")
            return False
        
        try:
            # Check if there's an active price for this store location (effective_to IS NULL)
            # First check for store-specific price, then fallback to general price
            result = self.supabase.table('product_pricing').select('id, price, store_name').eq(
                'product_id', product_id
            ).is_('effective_to', 'null').order('store_name', desc=True).order('effective_from', desc=True).limit(1).execute()
            
            # Check specifically for this store's price
            store_price_result = self.supabase.table('product_pricing').select('id, price').eq(
                'product_id', product_id
            ).eq('store_name', self.store_name).is_('effective_to', 'null').order('effective_from', desc=True).limit(1).execute()
            
            price_to_check = None
            price_id_to_close = None
            
            if store_price_result.data and len(store_price_result.data) > 0:
                # We have a store-specific price
                price_to_check = float(store_price_result.data[0]['price'])
                price_id_to_close = store_price_result.data[0]['id']
            elif result.data and len(result.data) > 0:
                # Check general price (no store_name)
                if not result.data[0].get('store_name'):
                    price_to_check = float(result.data[0]['price'])
                    price_id_to_close = result.data[0]['id']
            
            if price_to_check is not None:
                # Only update if price changed
                if abs(price_to_check - float(price)) > 0.01:
                    # Close old price
                    if price_id_to_close:
                        self.supabase.table('product_pricing').update({
                            'effective_to': datetime.utcnow().isoformat()
                        }).eq('id', price_id_to_close).execute()
                    
                    # Create new store-specific price
                    self.supabase.table('product_pricing').insert({
                        'product_id': product_id,
                        'price': float(price),
                        'store_name': self.store_name,  # Location-specific pricing
                        'effective_from': datetime.utcnow().isoformat()
                    }).execute()
                    logger.debug(f"Updated price for product {product_id} at {self.store_name}: ${price}")
            else:
                # Create new store-specific price
                self.supabase.table('product_pricing').insert({
                    'product_id': product_id,
                    'price': float(price),
                    'store_name': self.store_name,  # Location-specific pricing
                    'effective_from': datetime.utcnow().isoformat()
                }).execute()
                logger.debug(f"Created price for product {product_id} at {self.store_name}: ${price}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert price for product {product_id}: {e}")
            return False
    
    def import_item(self, item: Dict) -> Tuple[bool, str]:
        """Import a single Costco item."""
        item_number = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', 'unknown'))
        location = item.get('item_location_locationNumber', 'unknown')
        
        # Verify this item is for the expected location
        if self.location_number and location != self.location_number:
            logger.debug(f"Skipping item {item_number} - location {location} doesn't match {self.location_number}")
            return False, f"Location mismatch: {location} != {self.location_number}"
        
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
    
    def deactivate_other_items(self, current_item_ids: Set[str]):
        """Deactivate Costco items that are not in the current inventory."""
        if not self.location_number:
            logger.warning("Cannot deactivate other items without location number")
            return
        
        try:
            # Find all active Costco mappings for this location
            result = self.supabase.table('product_store_mappings').select('id, store_item_id').eq(
                'store_name', self.store_name
            ).eq('is_active', True).execute()
            
            if not result.data:
                return
            
            deactivated = 0
            for mapping in result.data:
                store_item_id = mapping.get('store_item_id')
                if store_item_id not in current_item_ids:
                    self.supabase.table('product_store_mappings').update({
                        'is_active': False,
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('id', mapping['id']).execute()
                    deactivated += 1
                    logger.debug(f"Deactivated item {store_item_id} (not in current inventory)")
            
            if deactivated > 0:
                logger.info(f"Deactivated {deactivated} items not in current inventory")
            
        except Exception as e:
            logger.error(f"Failed to deactivate other items: {e}")
    
    def import_from_api_response(self, data: Dict) -> Dict[str, any]:
        """
        Import Costco products from Fusion API response dict (for dynamic scraper).
        
        Args:
            data: Dictionary containing Fusion API response structure
            
        Returns:
            Dictionary with import statistics
        """
        # Extract items from Fusion API response structure
        response = data.get('response', {})
        items = response.get('docs', [])
        num_found = response.get('numFound', len(items))
        
        logger.debug(f"Processing {len(items)} items from Fusion API (numFound: {num_found})")
        
        # Extract location number from first item if not provided
        if not self.location_number and items:
            location = items[0].get('item_location_locationNumber')
            if location:
                self.location_number = location
                self.store_name = f"costco-{location}"
                logger.info(f"Detected location number: {location}")
        
        stats = {
            'total': len(items),
            'imported': 0,
            'failed': 0,
            'errors': [],
            'current_item_ids': set()
        }
        
        for i, item in enumerate(items, 1):
            item_number = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', 'unknown'))
            stats['current_item_ids'].add(item_number)
            
            logger.debug(f"[{i}/{len(items)}] Processing: {item.get('item_product_name', 'Unknown')[:50]}")
            
            success, message = self.import_item(item)
            if success:
                stats['imported'] += 1
            else:
                stats['failed'] += 1
                stats['errors'].append(message)
                logger.warning(f"  {message}")
        
        # Note: We don't deactivate items here - that's handled by the scraper after all pages
        # This allows batch processing across multiple pages
        
        return stats
    
    def import_from_file(self, file_path: str) -> Dict[str, int]:
        """Import all Costco products from Fusion API JSON file."""
        logger.info(f"Loading products from {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract items from Fusion API response structure
        response = data.get('response', {})
        items = response.get('docs', [])
        num_found = response.get('numFound', len(items))
        
        logger.info(f"Loaded {len(items)} items from Fusion API (numFound: {num_found})")
        
        # Extract location number from first item if not provided
        if not self.location_number and items:
            location = items[0].get('item_location_locationNumber')
            if location:
                self.location_number = location
                self.store_name = f"costco-{location}"
                logger.info(f"Detected location number: {location}")
        
        stats = {
            'total': len(items),
            'imported': 0,
            'failed': 0,
            'errors': [],
            'current_item_ids': set()
        }
        
        for i, item in enumerate(items, 1):
            item_number = str(item.get('item_number', '')) or str(item.get('item_location_itemNumber', 'unknown'))
            stats['current_item_ids'].add(item_number)
            
            logger.info(f"[{i}/{len(items)}] Processing: {item.get('item_product_name', 'Unknown')[:50]}")
            
            success, message = self.import_item(item)
            if success:
                stats['imported'] += 1
            else:
                stats['failed'] += 1
                stats['errors'].append(message)
                logger.error(f"  {message}")
        
        # Deactivate items not in current inventory
        if stats['current_item_ids']:
            self.deactivate_other_items(stats['current_item_ids'])
        
        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Import Costco products from Fusion API response')
    parser.add_argument('fusion_file', help='Path to JSON file containing Fusion API response')
    parser.add_argument('--location-number', help='Costco warehouse location number (e.g., 681-wh)')
    
    args = parser.parse_args()
    
    file_path = args.fusion_file
    if not Path(file_path).exists():
        logger.error(f"File not found: {file_path}")
        sys.exit(1)
    
    importer = CostcoFusionAPIImporter(location_number=args.location_number)
    stats = importer.import_from_file(file_path)
    
    logger.info("=" * 60)
    logger.info("Import Complete!")
    logger.info("=" * 60)
    logger.info(f"Total items: {stats['total']}")
    logger.info(f"Successfully imported: {stats['imported']}")
    logger.info(f"Failed: {stats['failed']}")
    
    if stats['errors']:
        logger.warning(f"\nFirst 10 errors:")
        for error in stats['errors'][:10]:
            logger.warning(f"  - {error}")


if __name__ == '__main__':
    main()

