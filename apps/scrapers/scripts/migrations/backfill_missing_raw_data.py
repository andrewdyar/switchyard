#!/usr/bin/env python3
"""
Backfill script to update products missing raw_data.

This script:
1. Finds all products that are missing raw_data
2. For products with HEB store_item_id, searches HEB API to fetch full product details
3. Updates products with raw_data and other missing fields

Usage:
    python backfill_missing_raw_data.py --store-id 202 --limit 100
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


def get_products_missing_raw_data(limit: Optional[int] = None, offset: int = 0, store_name: str = 'heb', product_id: Optional[str] = None):
    """
    Get products missing raw_data OR products that were processed with incomplete pricing.
    
    Includes:
    1. Products missing raw_data entirely (ALL of them, not just those with HEB mappings)
    2. Products that have raw_data but were updated during the first backfill run
       (between ~2:26 PM and ~2:46 PM when anon key was used - these have incomplete pricing)
    """
    client = get_client()
    
    # First, get ALL products missing raw_data - PAGINATE through all results
    # Use left join to get products even without mappings, then filter for HEB mappings
    products_missing_raw = []
    missing_raw_offset = 0
    batch_size = 1000
    
    # Use a set to track processed product IDs for deduplication
    processed_product_ids = set()
    
    while True:
        # Get all products missing raw_data, including their store mappings
        query_missing_raw = client.table('products').select(
            'id,name,product_store_mappings(store_name,store_item_id,product_id)'
        ).is_('raw_data', 'null')
        
        if product_id:
            query_missing_raw = query_missing_raw.eq('id', product_id)
        
        result_missing_raw = query_missing_raw.range(missing_raw_offset, missing_raw_offset + batch_size - 1).execute()
        batch = result_missing_raw.data or []
        
        if not batch:
            break
        
        batch_products_added = 0
        for item in batch:
            # Skip if we've already processed this product ID (deduplicate)
            item_product_id = item['id']
            if item_product_id in processed_product_ids:
                continue
            
            # Find HEB mapping if it exists
            heb_mapping = None
            mappings = item.get('product_store_mappings', [])
            
            if isinstance(mappings, list):
                for mapping in mappings:
                    if mapping.get('store_name') == store_name and mapping.get('store_item_id'):
                        heb_mapping = mapping
                        break
            elif isinstance(mappings, dict) and mappings.get('store_name') == store_name:
                heb_mapping = mappings if mappings.get('store_item_id') else None
            
            # Only include products that have HEB mappings with store_item_id
            # (we need store_item_id to fetch from HEB API)
            if heb_mapping and heb_mapping.get('store_item_id'):
                products_missing_raw.append({
                    'id': item_product_id,
                    'name': item['name'],
                    'store_mapping': heb_mapping
                })
                processed_product_ids.add(item_product_id)
                batch_products_added += 1
        
        # Continue paginating until we get no more results
        # (even if this batch had fewer products due to filtering)
        if len(batch) < batch_size:
            break
        
        missing_raw_offset += batch_size
    
    # Second, get products that were processed in the first backfill run (have raw_data, updated during that window)
    # The first backfill ran from ~2:26 PM to ~2:46 PM local time
    # Current script started at ~2:54 PM, so products updated before 2:54 PM today with raw_data are from first run
    from datetime import datetime, timezone
    current_script_start = datetime(2025, 11, 23, 20, 54, 0, tzinfo=timezone.utc).isoformat()  # 2:54 PM CST = 20:54 UTC
    first_run_start = datetime(2025, 11, 23, 20, 26, 0, tzinfo=timezone.utc).isoformat()  # 2:26 PM CST = 20:26 UTC
    
    # Paginate through first run products too
    products_incomplete_pricing = []
    incomplete_offset = 0
    
    while True:
        query_incomplete = client.table('products').select(
            'id,name,product_store_mappings!inner(product_id,store_item_id,store_name),updated_at'
        ).not_.is_('raw_data', 'null')
        
        query_incomplete = query_incomplete.eq('product_store_mappings.store_name', store_name)
        query_incomplete = query_incomplete.not_.is_('product_store_mappings.store_item_id', 'null')
        # Products updated between first run start and current script start (with raw_data) = incomplete pricing
        query_incomplete = query_incomplete.gte('updated_at', first_run_start)
        query_incomplete = query_incomplete.lt('updated_at', current_script_start)
        
        if product_id:
            query_incomplete = query_incomplete.eq('id', product_id)
        
        result_incomplete = query_incomplete.range(incomplete_offset, incomplete_offset + batch_size - 1).execute()
        batch = result_incomplete.data or []
        
        if not batch:
            break
        
        for item in batch:
            if item.get('product_store_mappings'):
                mappings = item['product_store_mappings']
                if isinstance(mappings, list) and len(mappings) > 0:
                    mapping = mappings[0]
                elif isinstance(mappings, dict):
                    mapping = mappings
                else:
                    continue
                products_incomplete_pricing.append({
                    'id': item['id'],
                    'name': item['name'],
                    'store_mapping': mapping
                })
        
        if len(batch) < batch_size:
            break
        
        incomplete_offset += batch_size
    
    # Combine: products missing raw_data + products with incomplete pricing
    # Deduplicate by product ID
    all_products_dict = {}
    
    # Add products missing raw_data
    for product in products_missing_raw:
        all_products_dict[product['id']] = product
    
    # Add products with incomplete pricing (avoid duplicates)
    for product in products_incomplete_pricing:
        if product['id'] not in all_products_dict:
            all_products_dict[product['id']] = product
    
    # Convert to list
    all_products = list(all_products_dict.values())
    
    # Apply limit/offset if specified (for pagination support)
    if limit and not product_id:
        all_products = all_products[offset:offset + limit]
    elif offset and not product_id:
        all_products = all_products[offset:]
    
    return all_products


def fetch_product_by_id(scraper: HEBProductScraper, store_item_id: str) -> Optional[Dict]:
    """
    Fetch product data directly from HEB using the product detail endpoint.
    
    Uses: /_next/data/{buildId}/product-detail/{productId}.json?productId={productId}
    
    Args:
        scraper: HEBProductScraper instance
        store_item_id: HEB store item ID (product ID)
        
    Returns:
        Product data dict if successful, None otherwise
    """
    try:
        # Get the build ID (scraper has a method for this)
        build_id = scraper.get_nextjs_build_id()
        
        # Construct the URL
        url = f"https://www.heb.com/_next/data/{build_id}/product-detail/{store_item_id}.json"
        params = {'productId': store_item_id}
        
        # Set headers to match browser request
        headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.6',
            'DNT': '1',
            'Priority': 'u=1, i',
            'Referer': f'https://www.heb.com/product-detail/{store_item_id}',
            'Sec-CH-UA': '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-GPC': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'x-nextjs-data': '1',
        }
        
        # Add cookies if available
        if scraper._cookies:
            headers['Cookie'] = scraper._cookies
        
        # Make the request
        response = scraper.client.session.get(url, params=params, headers=headers, timeout=15)
        
        if response.status_code != 200:
            logger.warning(f"Failed to fetch product {store_item_id}: {response.status_code} {response.reason}")
            return None
        
        data = response.json()
        
        # Extract product from pageProps
        page_props = data.get('pageProps', {})
        product = page_props.get('product')
        
        if not product:
            logger.warning(f"No product data found in response for {store_item_id}")
            return None
        
        return product
        
    except Exception as e:
        logger.error(f"Error fetching product {store_item_id}: {e}")
        return None


def fetch_and_update_product(scraper: HEBProductScraper, product_id: str, product_name: str, store_item_id: str) -> bool:
    """
    Fetch product data from HEB and update the product with raw_data.
    
    Args:
        scraper: HEBProductScraper instance
        product_id: UUID of the product in Supabase
        product_name: Name of the product (for logging)
        store_item_id: HEB store item ID
        
    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info(f"Fetching product data for: {product_name} (HEB ID: {store_item_id})")
        
        # Fetch product directly by ID using the product detail endpoint
        found_product = fetch_product_by_id(scraper, store_item_id)
        
        if not found_product:
            logger.warning(f"Could not fetch product {store_item_id} from HEB")
            return False
        
        # The found_product is already in the format we need, but we need to wrap it
        # in a structure that extract_product_data expects (it expects search result format)
        # Actually, let's check what format extract_product_data expects and adapt accordingly
        # For now, let's try using extract_product_data - it might work with the product detail format
        
        # Try extracting - if it fails, we'll construct the data manually
        extracted_product = None
        try:
            extracted_product = scraper.extract_product_data(found_product)
        except Exception as e:
            logger.debug(f"extract_product_data failed, constructing manually: {e}")
        
        # If extraction failed, construct the product data manually from the product detail response
        if not extracted_product:
            # Construct product data in the format expected by store_product_in_supabase
            # The product detail endpoint returns a different structure than search results
            extracted_product = {
                'product_id': str(found_product.get('id', store_item_id)),
                'name': found_product.get('fullDisplayName') or found_product.get('displayName', product_name),
                'brand_name': found_product.get('brand', {}).get('name') if found_product.get('brand') else None,
                'product_page_url': found_product.get('productPageURL', f'/product-detail/{store_item_id}'),
                'full_category_hierarchy': found_product.get('fullCategoryHierarchy'),
                'image_url': None,
                'is_new': found_product.get('isNew', False),
                'on_ad': found_product.get('onAd', False),
                'best_available': found_product.get('bestAvailable', False),
                'priced_by_weight': found_product.get('pricedByWeight', False),
                'show_coupon_flag': found_product.get('showCouponFlag', False),
                'in_assortment': found_product.get('inAssortment', True),
                'raw_data': found_product,  # Store the full product detail response
            }
            
            # Extract image URL
            if found_product.get('productImageUrls') and len(found_product['productImageUrls']) > 0:
                # Get medium or large image
                for img in found_product['productImageUrls']:
                    if img.get('size') in ['MEDIUM', 'LARGE']:
                        extracted_product['image_url'] = img.get('url')
                        break
                # Fallback to first image
                if not extracted_product['image_url']:
                    extracted_product['image_url'] = found_product['productImageUrls'][0].get('url')
            
            # Extract stock status
            inventory = found_product.get('inventory', {})
            inventory_state = inventory.get('inventoryState', 'UNKNOWN') if inventory else 'UNKNOWN'
            extracted_product['stock_status'] = inventory_state.lower().replace('_', '_')
            
            # Extract location
            product_location = found_product.get('productLocation', {})
            extracted_product['location'] = product_location.get('location') if product_location else None
            
            # Extract availability and order quantities
            if found_product.get('SKUs') and len(found_product['SKUs']) > 0:
                first_sku = found_product['SKUs'][0]
                extracted_product['product_availability'] = first_sku.get('productAvailability', [])
                extracted_product['minimum_order_quantity'] = found_product.get('minimumOrderQuantity')
                extracted_product['maximum_order_quantity'] = found_product.get('maximumOrderQuantity')
                
                # Extract UPC and size from first SKU
                extracted_product['upc'] = first_sku.get('twelveDigitUPC')
                extracted_product['size'] = first_sku.get('customerFriendlySize')
            
            # Extract pricing from first SKU
            if found_product.get('SKUs') and len(found_product['SKUs']) > 0:
                first_sku = found_product['SKUs'][0]
                context_prices = first_sku.get('contextPrices', [])
                
                online_pricing = None
                curbside_pricing = None
                
                for price_context in context_prices:
                    context = price_context.get('context')
                    if context == 'ONLINE':
                        online_pricing = price_context
                    elif context == 'CURBSIDE':
                        curbside_pricing = price_context
                
                extracted_product['online_pricing'] = online_pricing
                extracted_product['curbside_pricing'] = curbside_pricing
            
            # Extract analytics if available
            analytics = found_product.get('analyticsProductProperties')
            if analytics:
                extracted_product['analytics'] = analytics
            
            # Extract all SKUs for storage
            extracted_product['all_skus'] = found_product.get('SKUs', [])
            if extracted_product['all_skus']:
                extracted_product['sku_id'] = extracted_product['all_skus'][0].get('id')
            
            # Add store_id if available
            if found_product.get('storeId'):
                extracted_product['store_id'] = str(found_product.get('storeId'))
        
        if not extracted_product:
            logger.warning(f"Failed to extract/construct product data for {store_item_id}")
            return False
        
        # Use the scraper's store_product_in_supabase method which handles all the complex logic
        # This will update the product with raw_data and all other fields
        if scraper.dry_run:
            logger.info(f"  [DRY-RUN] Would update product {product_id} with raw_data")
            logger.info(f"  [DRY-RUN] Product data: {extracted_product.get('name')} (HEB ID: {extracted_product.get('product_id')})")
            return True
        
        # Store the product using the scraper's method
        success = scraper.store_product_in_supabase(extracted_product)
        
        if success:
            logger.info(f"  ✅ Updated product {product_id} with raw_data")
            return True
        else:
            logger.error(f"Failed to update product {product_id}")
            return False
        
    except Exception as e:
        logger.error(f"Error fetching/updating product {store_item_id}: {e}", exc_info=True)
        return False


def main():
    parser = argparse.ArgumentParser(description='Backfill products missing raw_data')
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
    parser.add_argument('--store-name', type=str, default='heb',
                       help='Store name to filter by (default: heb)')
    parser.add_argument('--product-id', type=str, default=None,
                       help='Specific product ID to backfill (for testing)')
    args = parser.parse_args()
    
    store_id = args.store_id or os.getenv('HEB_STORE_ID', '202')
    cookies = args.cookies or os.getenv('HEB_COOKIES')
    
    if not cookies:
        logger.error("HEB cookies required. Set HEB_COOKIES env var or use --cookies")
        return 1
    
    # Check if service role key is available (needed for updates due to RLS)
    from supabase_config import get_config
    config = get_config()
    service_role_key = config.get_service_role_key()
    
    if not service_role_key and not args.dry_run:
        logger.warning("⚠️  SUPABASE_SERVICE_ROLE_KEY not set in environment.")
        logger.warning("   Product updates may work, but pricing updates will fail due to RLS.")
        logger.warning("   Set SUPABASE_SERVICE_ROLE_KEY environment variable for full functionality.")
    elif service_role_key:
        logger.info("✅ SUPABASE_SERVICE_ROLE_KEY is set - all updates will work")
    
    logger.info("=" * 80)
    logger.info("Backfill Products Missing Raw Data")
    logger.info("=" * 80)
    logger.info(f"Store ID: {store_id}")
    logger.info(f"Store name filter: {args.store_name}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info("")
    
    # Initialize scraper
    scraper = HEBProductScraper(store_id=store_id, cookies=cookies, dry_run=args.dry_run)
    
    # Get products missing raw_data OR missing pricing
    logger.info("Fetching products missing raw_data or pricing from Supabase...")
    
    # Get all products (no pagination - fetch everything)
    logger.info("Fetching all products missing raw_data or pricing...")
    all_products = get_products_missing_raw_data(
        store_name=args.store_name,
        product_id=args.product_id
    )
    
    # Deduplicate by product ID to ensure each product only appears once
    # (in case there are any duplicates from multiple mappings)
    unique_products = {}
    for product in all_products:
        product_id = product['id']
        if product_id not in unique_products:
            unique_products[product_id] = product
        else:
            # If duplicate, log a warning but use the first one
            logger.warning(f"Duplicate product {product_id} found - using first mapping only")
    
    products = list(unique_products.values())
    total = len(products)
    logger.info(f"Found {total} products missing raw_data or pricing")
    
    if total == 0:
        logger.info("No products to backfill")
        return 0
    
    # Process products
    updated = 0
    skipped = 0
    errors = 0
    
    for idx, product_data in enumerate(products, 1):
        product_id = product_data.get('id')
        product_name = product_data.get('name', 'Unknown')
        
        # Get store_item_id from the store_mapping
        store_mapping = product_data.get('store_mapping')
        if not store_mapping:
            logger.warning(f"[{idx}/{total}] Product {product_id} has no store mapping, skipping")
            skipped += 1
            continue
        
        store_item_id = store_mapping.get('store_item_id')
        if not store_item_id:
            logger.warning(f"[{idx}/{total}] Product {product_id} has no store_item_id, skipping")
            skipped += 1
            continue
        
        logger.info(f"[{idx}/{total}] Processing: {product_name} (HEB ID: {store_item_id})")
        
        success = fetch_and_update_product(scraper, product_id, product_name, store_item_id)
        
        if success:
            updated += 1
        else:
            errors += 1
        
        # Rate limiting - be respectful to HEB's API
        if idx < total:
            delay = scraper._get_random_delay()
            logger.debug(f"Waiting {delay:.2f}s before next product...")
            time.sleep(delay)
    
    logger.info("")
    logger.info("=" * 80)
    logger.info("Backfill Summary")
    logger.info("=" * 80)
    logger.info(f"Total products: {total}")
    logger.info(f"Updated: {updated}")
    logger.info(f"Skipped: {skipped}")
    logger.info(f"Errors: {errors}")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

