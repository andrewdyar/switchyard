#!/usr/bin/env python3
"""
Generate shopping lists for multi-cart shoppers with price optimization.

This script:
1. Queries all pending orders requiring products
2. Finds all active retailers for each product
3. Selects retailer with lowest price (with fallback preferences)
4. Groups items by retailer for efficient shopping
5. Includes backup retailer options for flexibility
6. Generates JSON/CSV shopping lists per retailer

Run after daily scrapes complete (12:00 PM - Multi-Cart Sweep Start).
"""

import os
import sys
import json
import csv
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from collections import defaultdict

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.supabase_client import get_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Retailer preference order (for tie-breaking when prices are equal)
RETAILER_PREFERENCE = ['heb', 'target', 'walmart', 'costco', 'central_market']


def get_pending_orders(supabase_client) -> List[Dict[str, Any]]:
    """Get all pending orders with their order items."""
    try:
        result = supabase_client.table('orders').select(
            'id, order_number, order_items(id, product_id, quantity, unit_price)'
        ).eq('status', 'pending').execute()
        
        return result.data if result.data else []
    except Exception as e:
        logger.error(f"Error fetching pending orders: {e}")
        return []


def get_active_retailers_for_product(supabase_client, product_id: str) -> List[Dict[str, Any]]:
    """
    Get all active retailers for a product with current pricing.
    
    Returns list of mappings with current price information.
    """
    try:
        # Get all active mappings for this product
        mappings_result = supabase_client.table('product_store_mappings').select(
            'id, store_name, store_item_id, store_item_name, store_aisle, '
            'store_block, store_zone, last_seen_at'
        ).eq('product_id', product_id).eq('is_active', True).execute()
        
        if not mappings_result.data:
            return []
        
        # Get current prices for each mapping
        active_mappings = []
        for mapping in mappings_result.data:
            # Get current price (effective_to IS NULL)
            pricing_result = supabase_client.table('product_pricing').select(
                'price, effective_from'
            ).eq('product_id', product_id).eq(
                'store_name', mapping['store_name']
            ).is_('effective_to', 'null').order('effective_from', desc=True).limit(1).execute()
            
            if pricing_result.data:
                current_price = pricing_result.data[0]['price']
                active_mappings.append({
                    'mapping': mapping,
                    'price': float(current_price) if current_price else None,
                    'has_aisle': bool(mapping.get('store_aisle')),
                    'last_seen_at': mapping.get('last_seen_at')
                })
        
        return active_mappings
    except Exception as e:
        logger.error(f"Error fetching active retailers for product {product_id}: {e}")
        return []


def select_retailer(active_mappings: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Select retailer with lowest price, using fallback preferences.
    
    Returns primary mapping and list of backup options.
    """
    if not active_mappings:
        return None
    
    # Filter out mappings without prices
    priced_mappings = [m for m in active_mappings if m['price'] is not None]
    if not priced_mappings:
        return None
    
    # Sort by price, then by preferences
    def sort_key(m):
        mapping = m['mapping']
        retailer = mapping['store_name']
        preference_index = RETAILER_PREFERENCE.index(retailer) if retailer in RETAILER_PREFERENCE else 999
        
        return (
            m['price'],  # Primary: lowest price
            -m['has_aisle'],  # Secondary: prefer items with aisle location
            preference_index,  # Tertiary: retailer preference
        )
    
    priced_mappings.sort(key=sort_key)
    
    primary = priced_mappings[0]
    backups = priced_mappings[1:3]  # Top 2-3 backups
    
    return {
        'primary': primary,
        'backups': backups
    }


def get_product_details(supabase_client, product_id: str) -> Dict[str, Any]:
    """Get product details (name, UPC, etc.)."""
    try:
        result = supabase_client.table('products').select(
            'id, name, upc, brand, unit_of_measure'
        ).eq('id', product_id).limit(1).execute()
        
        return result.data[0] if result.data else {}
    except Exception as e:
        logger.error(f"Error fetching product details for {product_id}: {e}")
        return {}


def generate_shopping_lists(supabase_client) -> tuple[Dict[str, List[Dict]], List[Dict]]:
    """
    Generate shopping lists with price optimization.
    
    Returns:
        tuple: (shopping_lists_by_retailer, unavailable_items)
    """
    logger.info("Starting shopping list generation...")
    
    # Get pending orders
    orders = get_pending_orders(supabase_client)
    logger.info(f"Found {len(orders)} pending orders")
    
    shopping_lists = defaultdict(list)  # {retailer: [items]}
    unavailable_items = []
    product_quantities = defaultdict(int)  # Track total quantity needed per product
    
    # Aggregate quantities by product across all orders
    for order in orders:
        for item in order.get('order_items', []):
            product_id = item['product_id']
            quantity = item['quantity']
            product_quantities[product_id] += quantity
    
    logger.info(f"Processing {len(product_quantities)} unique products...")
    
    # Process each product
    for product_id, total_quantity in product_quantities.items():
        # Get product details
        product = get_product_details(supabase_client, product_id)
        if not product:
            logger.warning(f"Product {product_id} not found, skipping")
            continue
        
        # Get active retailers
        active_mappings = get_active_retailers_for_product(supabase_client, product_id)
        
        if not active_mappings:
            unavailable_items.append({
                'product_id': product_id,
                'product_name': product.get('name'),
                'upc': product.get('upc'),
                'quantity': total_quantity,
                'reason': 'No active retailers'
            })
            continue
        
        # Select retailer with lowest price
        selection = select_retailer(active_mappings)
        if not selection:
            unavailable_items.append({
                'product_id': product_id,
                'product_name': product.get('name'),
                'upc': product.get('upc'),
                'quantity': total_quantity,
                'reason': 'No pricing information'
            })
            continue
        
        primary = selection['primary']
        retailer = primary['mapping']['store_name']
        
        # Build shopping list item
        shopping_item = {
            'product_id': product_id,
            'product_name': product.get('name'),
            'upc': product.get('upc'),
            'brand': product.get('brand'),
            'quantity': total_quantity,
            'unit_price': primary['price'],
            'total_price': primary['price'] * total_quantity if primary['price'] else None,
            'store_item_id': primary['mapping']['store_item_id'],
            'store_item_name': primary['mapping'].get('store_item_name'),
            'aisle': primary['mapping'].get('store_aisle'),
            'block': primary['mapping'].get('store_block'),
            'zone': primary['mapping'].get('store_zone'),
            'last_seen_at': primary['last_seen_at'],
            'backup_retailers': [
                {
                    'retailer': backup['mapping']['store_name'],
                    'price': backup['price'],
                    'store_item_id': backup['mapping']['store_item_id']
                }
                for backup in selection['backups']
            ]
        }
        
        shopping_lists[retailer].append(shopping_item)
    
    # Sort items by aisle/location for efficient shopping
    for retailer in shopping_lists:
        shopping_lists[retailer].sort(key=lambda x: (
            x.get('zone', ''),
            x.get('aisle', ''),
            x.get('block', ''),
            x.get('product_name', '')
        ))
    
    logger.info(f"Generated shopping lists for {len(shopping_lists)} retailers")
    logger.info(f"Found {len(unavailable_items)} unavailable items")
    
    return dict(shopping_lists), unavailable_items


def save_shopping_lists(shopping_lists: Dict[str, List[Dict]], output_dir: str = 'output/shopping_lists'):
    """Save shopping lists to JSON and CSV files."""
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    
    # Save JSON (all retailers combined)
    json_path = os.path.join(output_dir, f'shopping_lists_{timestamp}.json')
    with open(json_path, 'w') as f:
        json.dump(shopping_lists, f, indent=2, default=str)
    logger.info(f"Saved JSON shopping lists to {json_path}")
    
    # Save CSV per retailer
    for retailer, items in shopping_lists.items():
        csv_path = os.path.join(output_dir, f'{retailer}_shopping_list_{timestamp}.csv')
        
        if not items:
            continue
        
        fieldnames = [
            'product_name', 'upc', 'brand', 'quantity', 'unit_price', 'total_price',
            'store_item_id', 'aisle', 'block', 'zone', 'backup_retailers'
        ]
        
        with open(csv_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for item in items:
                row = {
                    'product_name': item.get('product_name'),
                    'upc': item.get('upc'),
                    'brand': item.get('brand'),
                    'quantity': item.get('quantity'),
                    'unit_price': item.get('unit_price'),
                    'total_price': item.get('total_price'),
                    'store_item_id': item.get('store_item_id'),
                    'aisle': item.get('aisle'),
                    'block': item.get('block'),
                    'zone': item.get('zone'),
                    'backup_retailers': json.dumps(item.get('backup_retailers', []))
                }
                writer.writerow(row)
        
        logger.info(f"Saved {retailer} shopping list ({len(items)} items) to {csv_path}")


def save_unavailable_items(unavailable_items: List[Dict], output_dir: str = 'output/shopping_lists'):
    """Save unavailable items to JSON and CSV."""
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    
    if not unavailable_items:
        logger.info("No unavailable items to save")
        return
    
    # Save JSON
    json_path = os.path.join(output_dir, f'unavailable_items_{timestamp}.json')
    with open(json_path, 'w') as f:
        json.dump(unavailable_items, f, indent=2, default=str)
    logger.info(f"Saved unavailable items to {json_path}")
    
    # Save CSV
    csv_path = os.path.join(output_dir, f'unavailable_items_{timestamp}.csv')
    fieldnames = ['product_id', 'product_name', 'upc', 'quantity', 'reason']
    
    with open(csv_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unavailable_items)
    
    logger.info(f"Saved unavailable items CSV to {csv_path}")


def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("Shopping List Generation")
    logger.info("=" * 60)
    
    try:
        supabase_client = get_client()
        
        # Generate shopping lists
        shopping_lists, unavailable_items = generate_shopping_lists(supabase_client)
        
        # Save results
        save_shopping_lists(shopping_lists)
        save_unavailable_items(unavailable_items)
        
        # Print summary
        logger.info("=" * 60)
        logger.info("Summary")
        logger.info("=" * 60)
        for retailer, items in shopping_lists.items():
            total_items = sum(item['quantity'] for item in items)
            total_value = sum(item.get('total_price', 0) or 0 for item in items)
            logger.info(f"{retailer.upper()}: {len(items)} unique products, {total_items} total items, ${total_value:.2f} total value")
        
        if unavailable_items:
            logger.warning(f"⚠️  {len(unavailable_items)} items unavailable - check unavailable_items file")
        
        logger.info("=" * 60)
        logger.info("Shopping list generation complete!")
        
    except Exception as e:
        logger.error(f"Error generating shopping lists: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

