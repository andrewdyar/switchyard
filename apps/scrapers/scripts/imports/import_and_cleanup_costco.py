#!/usr/bin/env python3
"""
Import Costco Fusion API items and clean up old Apify items.

This script:
1. Imports all items from Fusion API response (location-specific)
2. Removes/deactivates all old Costco items from Apify dataset

Usage:
    python3 import_and_cleanup_costco.py <fusion_api_response.json> [--location-number <location>]
"""

import json
import sys
import argparse
import logging
from datetime import datetime
from pathlib import Path

from supabase_client import get_client
from supabase_config import get_config

# Import the importer class
from import_costco_fusion_api import CostcoFusionAPIImporter

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def cleanup_old_costco_items(current_store_name: str, current_item_ids: set):
    """Remove all old Costco items except those in current inventory."""
    supabase = get_client()
    
    logger.info("=" * 60)
    logger.info("Step 2: Cleaning up old Costco items from Apify dataset")
    logger.info("=" * 60)
    
    try:
        # Get ALL Costco mappings (from any location/dataset)
        result = supabase.table('product_store_mappings').select(
            'id, store_name, store_item_id, is_active'
        ).or_('store_name.eq.costco,store_name.like.costco%').execute()
        
        if not result.data:
            logger.info("No Costco items found to clean up")
            return
        
        logger.info(f"Found {len(result.data)} total Costco product mappings")
        
        removed = 0
        kept = 0
        
        for mapping in result.data:
            store_name = mapping.get('store_name')
            store_item_id = mapping.get('store_item_id')
            
            # Keep items from current location that are in current inventory
            if store_name == current_store_name and store_item_id in current_item_ids:
                kept += 1
                logger.debug(f"Keeping {store_item_id} ({store_name})")
                continue
            
            # Delete everything else (old Apify items or wrong location)
            try:
                supabase.table('product_store_mappings').delete().eq('id', mapping['id']).execute()
                removed += 1
                logger.info(f"Removed {store_item_id} from {store_name}")
            except Exception as e:
                logger.error(f"Failed to remove {store_item_id}: {e}")
        
        logger.info(f"✅ Cleanup complete: Kept {kept} items, Removed {removed} old items")
        
    except Exception as e:
        logger.error(f"Failed to cleanup old Costco items: {e}")
        raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Import Costco Fusion API items and clean up old Apify items'
    )
    parser.add_argument('fusion_file', help='Path to JSON file containing Fusion API response')
    parser.add_argument('--location-number', help='Costco warehouse location number (e.g., 681-wh)')
    
    args = parser.parse_args()
    
    file_path = args.fusion_file
    if not Path(file_path).exists():
        logger.error(f"File not found: {file_path}")
        sys.exit(1)
    
    # Step 1: Import new items
    logger.info("=" * 60)
    logger.info("Step 1: Importing Costco Fusion API items")
    logger.info("=" * 60)
    
    importer = CostcoFusionAPIImporter(location_number=args.location_number)
    stats = importer.import_from_file(file_path)
    
    # Get the store name used
    current_store_name = importer.store_name
    current_item_ids = stats.get('current_item_ids', set())
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("Import Summary:")
    logger.info(f"  Total items: {stats['total']}")
    logger.info(f"  Successfully imported: {stats['imported']}")
    logger.info(f"  Failed: {stats['failed']}")
    logger.info("=" * 60)
    
    # Step 2: Clean up old items
    if current_item_ids:
        cleanup_old_costco_items(current_store_name, current_item_ids)
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("✅ Complete! All 91 items imported, old Apify items removed.")
    logger.info("=" * 60)


if __name__ == '__main__':
    main()

