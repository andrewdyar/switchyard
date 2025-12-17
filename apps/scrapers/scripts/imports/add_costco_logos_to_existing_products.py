#!/usr/bin/env python3
"""
Add Costco brand logos to existing Costco products in the database.

This script updates all existing Costco product_store_mappings to include
the brand_logo_url pointing to the Costco logo in Supabase Storage.
"""

import logging
from supabase_client import get_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Costco logo URL in Supabase Storage
COSTCO_LOGO_URL = 'https://epwngkevdzaehiivtzpd.supabase.co/storage/v1/object/public/brand-logos/costco/logo.png'


def add_costco_logos():
    """Add Costco logos to all existing Costco product mappings."""
    try:
        client = get_client()
        
        logger.info("=" * 60)
        logger.info("Adding Costco Logos to Existing Products")
        logger.info("=" * 60)
        
        # Find all Costco product mappings (any store_name starting with 'costco')
        logger.info("Finding all Costco product mappings...")
        
        # Get all mappings that start with 'costco'
        result = client.table('product_store_mappings').select(
            'id, store_name, store_item_id, brand_logo_url'
        ).like('store_name', 'costco%').execute()
        
        mappings = result.data if result.data else []
        
        if not mappings:
            logger.info("No Costco product mappings found.")
            return
        
        logger.info(f"Found {len(mappings)} Costco product mappings")
        
        # Count how many need updates
        needs_update = [m for m in mappings if not m.get('brand_logo_url')]
        logger.info(f"  - {len(needs_update)} need logo added")
        logger.info(f"  - {len(mappings) - len(needs_update)} already have logos")
        
        if not needs_update:
            logger.info("✅ All Costco products already have logos!")
            return
        
        # Update mappings in batches
        updated = 0
        failed = 0
        
        logger.info(f"\nUpdating {len(needs_update)} product mappings...")
        
        for i, mapping in enumerate(needs_update, 1):
            try:
                mapping_id = mapping['id']
                store_name = mapping['store_name']
                store_item_id = mapping['store_item_id']
                
                # Update with logo URL
                client.table('product_store_mappings').update({
                    'brand_logo_url': COSTCO_LOGO_URL
                }).eq('id', mapping_id).execute()
                
                updated += 1
                
                if i % 50 == 0:
                    logger.info(f"  Progress: {i}/{len(needs_update)} updated...")
                    
            except Exception as e:
                logger.error(f"Failed to update mapping {mapping.get('id')}: {e}")
                failed += 1
        
        logger.info("\n" + "=" * 60)
        logger.info("Update Summary")
        logger.info("=" * 60)
        logger.info(f"✅ Updated: {updated}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"📊 Total processed: {len(needs_update)}")
        logger.info("=" * 60)
        
        if updated > 0:
            logger.info(f"\n✅ Successfully added Costco logos to {updated} products!")
        
    except Exception as e:
        logger.error(f"Failed to add Costco logos: {e}", exc_info=True)


if __name__ == '__main__':
    add_costco_logos()

