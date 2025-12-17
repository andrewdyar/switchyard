#!/usr/bin/env python3
"""
Backfill script to update existing HEB products with new fields.

This script:
1. Fetches all existing HEB products from Supabase
2. For each product, re-fetches data from HEB API to get full product details
3. Updates products with all new fields (raw_data, brand, pricing contexts, SKUs, analytics, etc.)

Note: This requires making API calls to HEB for each product, so it may take a while.
The running scraper will also naturally backfill products as it encounters them.
"""

import os
import sys
import time
import logging
import argparse
from typing import Dict, List, Optional
from datetime import datetime

from supabase_client import get_client
from heb_product_scraper import HEBProductScraper

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_all_heb_products(limit: Optional[int] = None, offset: int = 0):
    """Get all HEB products from Supabase."""
    client = get_client()
    
    query = client.table('product_store_mappings').select(
        'product_id,store_item_id,products!inner(id,name)'
    ).eq('store_name', 'heb').eq('is_active', True)
    
    if limit:
        query = query.range(offset, offset + limit - 1)
    
    result = query.execute()
    return result.data if result.data else []


def backfill_product(scraper: HEBProductScraper, store_item_id: str, product_uuid: str) -> bool:
    """
    Backfill a single product by fetching fresh data from HEB and updating.
    
    Args:
        scraper: HEBProductScraper instance
        store_item_id: HEB product ID (store_item_id)
        product_uuid: UUID of the product in Supabase
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Try to fetch product details from HEB
        # We'll use the search endpoint to find the product by ID
        # Note: This is a simplified approach - in practice, we might need to use
        # a different endpoint or method to fetch individual product details
        
        # For now, we'll skip products that we can't easily re-fetch
        # The running scraper will handle these as it encounters them
        logger.warning(f"Backfilling product {store_item_id} requires re-fetching from HEB API")
        logger.warning(f"This is not yet implemented - product will be updated when scraper encounters it")
        return False
        
    except Exception as e:
        logger.error(f"Error backfilling product {store_item_id}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Backfill existing HEB products with new fields')
    parser.add_argument('--store-id', type=str, default=None,
                       help='HEB store ID (default: from HEB_STORE_ID env var)')
    parser.add_argument('--cookies', type=str, default=None,
                       help='HEB cookies (default: from HEB_COOKIES env var)')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of products to process (for testing)')
    parser.add_argument('--offset', type=int, default=0,
                       help='Offset for pagination')
    parser.add_argument('--dry-run', action='store_true',
                       help='Dry run mode (no database updates)')
    
    args = parser.parse_args()
    
    store_id = args.store_id or os.getenv('HEB_STORE_ID', '202')
    cookies = args.cookies or os.getenv('HEB_COOKIES')
    
    if not cookies:
        logger.error("HEB cookies required. Set HEB_COOKIES env var or use --cookies")
        return 1
    
    logger.info("=" * 80)
    logger.info("HEB Product Backfill Script")
    logger.info("=" * 80)
    logger.info(f"Store ID: {store_id}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info("")
    
    # Initialize scraper (we'll use it for extraction logic)
    scraper = HEBProductScraper(store_id=store_id, cookies=cookies, dry_run=args.dry_run)
    
    # Get all HEB products
    logger.info("Fetching HEB products from Supabase...")
    products = get_all_heb_products(limit=args.limit, offset=args.offset)
    
    total = len(products)
    logger.info(f"Found {total} HEB products to backfill")
    
    if total == 0:
        logger.info("No products to backfill")
        return 0
    
    # Process products
    updated = 0
    skipped = 0
    errors = 0
    
    for idx, mapping in enumerate(products, 1):
        product_uuid = mapping.get('product_id')
        store_item_id = mapping.get('store_item_id')
        product_name = mapping.get('products', {}).get('name', 'Unknown') if isinstance(mapping.get('products'), dict) else 'Unknown'
        
        logger.info(f"[{idx}/{total}] Processing: {product_name} (HEB ID: {store_item_id})")
        
        success = backfill_product(scraper, store_item_id, product_uuid)
        
        if success:
            updated += 1
        elif success is None:
            skipped += 1
        else:
            errors += 1
        
        # Rate limiting
        if idx < total:
            time.sleep(1.0)  # Be respectful to HEB's API
    
    logger.info("")
    logger.info("=" * 80)
    logger.info("Backfill Summary")
    logger.info("=" * 80)
    logger.info(f"Total products: {total}")
    logger.info(f"Updated: {updated}")
    logger.info(f"Skipped: {skipped}")
    logger.info(f"Errors: {errors}")
    logger.info("")
    logger.info("Note: The running scraper will also naturally backfill products")
    logger.info("      as it encounters them during normal scraping operations.")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

