#!/usr/bin/env python3
"""
Clean up old Costco items from Apify dataset import.

This script removes/deactivates Costco product mappings that are not
from the specified location or were from the old Apify dataset.

Usage:
    python3 cleanup_old_costco_items.py --location-number 681-wh [--deactivate-only]
"""

import argparse
import logging
from datetime import datetime

from supabase_client import get_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def cleanup_old_costco_items(location_number: str, deactivate_only: bool = False):
    """
    Remove or deactivate old Costco items not matching the current location.
    
    Args:
        location_number: Current warehouse location number (e.g., "681-wh")
        deactivate_only: If True, only deactivate (set is_active=False), don't delete
    """
    supabase = get_client()
    
    # Current store name for the location
    current_store_name = f"costco-{location_number}"
    
    logger.info(f"Cleaning up old Costco items (keeping only {current_store_name})")
    
    try:
        # Get all Costco mappings
        result = supabase.table('product_store_mappings').select(
            'id, store_name, store_item_id, is_active'
        ).or_('store_name.eq.costco,store_name.like.costco%').execute()
        
        if not result.data:
            logger.info("No Costco items found")
            return
        
        logger.info(f"Found {len(result.data)} Costco product mappings")
        
        removed = 0
        deactivated = 0
        
        for mapping in result.data:
            store_name = mapping.get('store_name')
            
            # Keep only items from the current location
            if store_name == current_store_name:
                logger.debug(f"Keeping {mapping.get('store_item_id')} ({store_name})")
                continue
            
            # Remove or deactivate items from other locations/Apify dataset
            if deactivate_only:
                # Just deactivate
                supabase.table('product_store_mappings').update({
                    'is_active': False,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', mapping['id']).execute()
                deactivated += 1
                logger.info(f"Deactivated {mapping.get('store_item_id')} ({store_name})")
            else:
                # Delete completely
                supabase.table('product_store_mappings').delete().eq('id', mapping['id']).execute()
                removed += 1
                logger.info(f"Removed {mapping.get('store_item_id')} ({store_name})")
        
        if deactivate_only:
            logger.info(f"✅ Deactivated {deactivated} old Costco items")
        else:
            logger.info(f"✅ Removed {removed} old Costco items")
        
    except Exception as e:
        logger.error(f"Failed to cleanup old Costco items: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description='Clean up old Costco items from Apify dataset')
    parser.add_argument('--location-number', required=True, help='Current warehouse location (e.g., 681-wh)')
    parser.add_argument('--deactivate-only', action='store_true', 
                       help='Only deactivate items instead of deleting them')
    
    args = parser.parse_args()
    
    cleanup_old_costco_items(args.location_number, args.deactivate_only)


if __name__ == '__main__':
    main()

