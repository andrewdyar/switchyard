#!/usr/bin/env python3
"""
Check HEB scraper progress by querying Supabase.
"""

from supabase_client import get_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_progress():
    """Check scraper progress from database."""
    try:
        client = get_client()
        
        # Count total HEB products
        heb_count = client.table('product_store_mappings').select('id', count='exact').eq('store_name', 'heb').eq('is_active', True).execute()
        total_heb = heb_count.count if hasattr(heb_count, 'count') else len(heb_count.data) if heb_count.data else 0
        
        # Count products with full data (raw_data and brand populated)
        enriched_count = client.table('products').select('id', count='exact').not_.is_('raw_data', 'null').not_.eq('brand', '').execute()
        enriched = enriched_count.count if hasattr(enriched_count, 'count') else len(enriched_count.data) if enriched_count.data else 0
        
        # Count products with raw_data
        raw_data_count = client.table('products').select('id', count='exact').not_.is_('raw_data', 'null').execute()
        with_raw_data = raw_data_count.count if hasattr(raw_data_count, 'count') else len(raw_data_count.data) if raw_data_count.data else 0
        
        # Count total products
        total_products = client.table('products').select('id', count='exact').execute()
        total = total_products.count if hasattr(total_products, 'count') else len(total_products.data) if total_products.data else 0
        
        # Count categories
        categories_count = client.table('categories').select('id', count='exact').eq('source', 'goods').execute()
        categories = categories_count.count if hasattr(categories_count, 'count') else len(categories_count.data) if categories_count.data else 0
        
        print("\n" + "="*60)
        print("HEB Scraper Progress")
        print("="*60)
        print(f"Total HEB Products: {total_heb:,}")
        print(f"Products with Raw Data: {with_raw_data:,}")
        print(f"Products with Full Data (raw_data + brand): {enriched:,}")
        print(f"Total Products (all stores): {total:,}")
        print(f"Categories Created: {categories:,}")
        print("="*60)
        
        if total_heb > 0:
            enrichment_pct = (enriched / total_heb) * 100 if total_heb > 0 else 0
            print(f"\nEnrichment Progress: {enrichment_pct:.1f}% ({enriched:,}/{total_heb:,})")
        
    except Exception as e:
        logger.error(f"Error checking progress: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_progress()

