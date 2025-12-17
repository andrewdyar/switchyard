"""
Create initial data after schema deployment.

This script creates:
1. The 7 retailer stores
2. Basic inventory locations (zones A-D)
3. Optional: pickup portals

Run this AFTER deploying the schema to Supabase.

Usage:
    python setup_initial_data.py
"""

import os
import sys
import logging
from supabase_client import get_client, SupabaseService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def create_stores(service: SupabaseService):
    """Create the 7 retailer stores."""
    logger.info("Creating stores...")
    
    stores = [
        {
            'name': 'heb',
            'display_name': 'HEB',
            'is_active': True,
            'estimated_duration_minutes': 30
        },
        {
            'name': 'walmart',
            'display_name': 'Walmart',
            'is_active': True,
            'estimated_duration_minutes': 30
        },
        {
            'name': 'costco',
            'display_name': 'Costco',
            'is_active': True,
            'estimated_duration_minutes': 45
        },
        {
            'name': 'target',
            'display_name': 'Target',
            'is_active': True,
            'estimated_duration_minutes': 30
        },
        {
            'name': 'whole_foods',
            'display_name': 'Whole Foods',
            'is_active': True,
            'estimated_duration_minutes': 30
        },
        {
            'name': 'central_market',
            'display_name': 'Central Market',
            'is_active': True,
            'estimated_duration_minutes': 30
        },
        {
            'name': 'trader_joes',
            'display_name': "Trader Joe's",
            'is_active': True,
            'estimated_duration_minutes': 30
        },
    ]
    
    created_count = 0
    skipped_count = 0
    
    for store in stores:
        try:
            # Check if store exists
            existing = service.select('stores', columns='id,name', filters={'name': store['name']})
            if existing:
                logger.info(f"  ⏭️  Store '{store['display_name']}' already exists (ID: {existing[0]['id']})")
                skipped_count += 1
                continue
            
            # Create store
            result = service.insert('stores', store)
            if result:
                created_count += 1
                store_id = result[0]['id']
                logger.info(f"  ✅ Created store: {store['display_name']} (ID: {store_id})")
        except Exception as e:
            logger.error(f"  ❌ Failed to create store {store['name']}: {e}")
    
    logger.info(f"✅ Stores: {created_count} created, {skipped_count} already existed")
    return created_count + skipped_count


def create_inventory_locations(service: SupabaseService):
    """Create basic inventory locations (zones)."""
    logger.info("Creating inventory locations...")
    
    zones = [
        {'zone': 'A', 'description': 'Zone A - Fast movers'},
        {'zone': 'B', 'description': 'Zone B - Medium movers'},
        {'zone': 'C', 'description': 'Zone C - Slow movers'},
        {'zone': 'D', 'description': 'Zone D - Overflow'},
    ]
    
    created_count = 0
    skipped_count = 0
    
    for zone_info in zones:
        zone = zone_info['zone']
        description = zone_info['description']
        
        try:
            # Check if location exists (zone with no shelf/bin)
            existing = service.select(
                'inventory_locations',
                columns='id,zone',
                filters={'zone': zone, 'shelf': None, 'bin': None}
            )
            if existing:
                logger.info(f"  ⏭️  Zone '{zone}' already exists (ID: {existing[0]['id']})")
                skipped_count += 1
                continue
            
            # Create zone
            result = service.insert('inventory_locations', {
                'zone': zone,
                'shelf': None,
                'bin': None,
                'description': description,
                'is_active': True
            })
            if result:
                created_count += 1
                location_id = result[0]['id']
                logger.info(f"  ✅ Created zone: {zone} (ID: {location_id})")
        except Exception as e:
            logger.error(f"  ❌ Failed to create zone {zone}: {e}")
    
    logger.info(f"✅ Inventory locations: {created_count} created, {skipped_count} already existed")
    return created_count + skipped_count


def create_pickup_portals(service: SupabaseService):
    """Create initial pickup portals."""
    logger.info("Creating pickup portals...")
    
    portals = [
        {'name': 'Portal 1', 'location': 'Main entrance', 'is_active': True},
        {'name': 'Portal 2', 'location': 'Secondary entrance', 'is_active': True},
    ]
    
    created_count = 0
    skipped_count = 0
    
    for portal in portals:
        try:
            # Check if portal exists
            existing = service.select('pickup_portals', columns='id', filters={'name': portal['name']})
            if existing:
                logger.info(f"  ⏭️  Portal '{portal['name']}' already exists")
                skipped_count += 1
                continue
            
            # Create portal
            result = service.insert('pickup_portals', portal)
            if result:
                created_count += 1
                portal_id = result[0]['id']
                logger.info(f"  ✅ Created portal: {portal['name']} (ID: {portal_id})")
        except Exception as e:
            logger.error(f"  ❌ Failed to create portal {portal['name']}: {e}")
    
    logger.info(f"✅ Pickup portals: {created_count} created, {skipped_count} already existed")
    return created_count + skipped_count


def main():
    """Main function."""
    logger.info("=" * 60)
    logger.info("Initial Data Setup Script")
    logger.info("=" * 60)
    
    # Check environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url:
        logger.error("❌ SUPABASE_URL environment variable not set")
        sys.exit(1)
    
    if not supabase_key:
        logger.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set")
        sys.exit(1)
    
    try:
        # Initialize service
        service = SupabaseService()
        
        # Test connection by checking if tables exist
        logger.info("Testing connection...")
        try:
            test = service.select('stores', columns='id', limit=1)
            logger.info("✅ Connection successful - schema appears to be deployed")
        except Exception as e:
            logger.error(f"❌ Connection failed - schema may not be deployed yet: {e}")
            logger.error("Please deploy the schema first by running SQL files in Supabase SQL Editor")
            sys.exit(1)
        
        # Create initial data
        logger.info("\n" + "-" * 60)
        create_stores(service)
        
        logger.info("\n" + "-" * 60)
        create_inventory_locations(service)
        
        logger.info("\n" + "-" * 60)
        create_pickup_portals(service)
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Initial data setup complete!")
        logger.info("=" * 60)
        logger.info("\nNext step: Run product migration")
        logger.info("  python migrate_products.py")
        
    except Exception as e:
        logger.error(f"Setup failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

