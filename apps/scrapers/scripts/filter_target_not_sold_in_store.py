#!/usr/bin/env python3
"""
Filter out products from target_products.json that are NOT_SOLD_IN_STORE.

This script:
1. Loads target_products.json
2. For products without aisle locations, checks fulfillment API
3. Removes products where in_store_only.availability_status == "NOT_SOLD_IN_STORE"
4. Saves the filtered JSON back to target_products.json
"""

import json
import os
import sys
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Any

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Target API configuration
API_KEY = os.getenv('TARGET_API_KEY', '9f36aeafbe60771e321a7cc95a78140772ab3e96')
STORE_ID = os.getenv('TARGET_STORE_ID', '95')
BASE_URL = "https://redsky.target.com/redsky_aggregations/v1"
MAX_WORKERS = 10  # Parallel API calls

def check_product_availability(tcin: str) -> Optional[bool]:
    """
    Check if a product is sold in-store.
    
    Args:
        tcin: Target item ID
        
    Returns:
        True if sold in-store, False if NOT_SOLD_IN_STORE, None on error
    """
    url = f"{BASE_URL}/web/product_fulfillment_and_variation_hierarchy_v1"
    
    params = {
        'key': API_KEY,
        'tcin': tcin,
        'store_id': STORE_ID,
        'required_store_id': STORE_ID,
        'pricing_store_id': STORE_ID,
        'scheduled_delivery_store_id': STORE_ID,
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        
        # Handle 404 as product not available
        if response.status_code == 404:
            return False
        
        response.raise_for_status()
        data = response.json()
        
        # Check fulfillment structure
        product = data.get('data', {}).get('product', {})
        fulfillment = product.get('fulfillment', {})
        store_options = fulfillment.get('store_options', [])
        
        if store_options:
            for option in store_options:
                in_store_only = option.get('in_store_only', {})
                availability_status = in_store_only.get('availability_status')
                
                if availability_status == 'NOT_SOLD_IN_STORE':
                    return False
                elif availability_status in ['IN_STOCK', 'OUT_OF_STOCK', 'UNAVAILABLE']:
                    # These are sold in-store (even if out of stock)
                    return True
        
        # If we have store_positions, it's definitely sold in-store
        store_positions = product.get('store_positions', [])
        if store_positions:
            return True
        
        # Default: assume sold in-store if we can't determine
        return True
        
    except requests.exceptions.HTTPError as e:
        # Other HTTP errors (already handled 404 above)
        print(f"  HTTP error checking {tcin}: {e}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"  Error checking {tcin}: {e}")
        return None
    except Exception as e:
        print(f"  Unexpected error checking {tcin}: {e}")
        return None


def filter_products(input_file: str = 'target_products.json', output_file: str = 'target_products.json'):
    """
    Filter out products that are NOT_SOLD_IN_STORE.
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file (can be same as input)
    """
    print("=" * 60)
    print("Filtering Target Products - Removing NOT_SOLD_IN_STORE items")
    print("=" * 60)
    
    # Load products
    print(f"\nLoading {input_file}...")
    with open(input_file) as f:
        data = json.load(f)
    
    products = data.get('products', [])
    metadata = data.get('metadata', {})
    
    print(f"Total products: {len(products):,}")
    
    # Separate products with and without aisle
    products_with_aisle = [p for p in products if p.get('store_aisle')]
    products_without_aisle = [p for p in products if not p.get('store_aisle')]
    
    print(f"Products with aisle (keep all): {len(products_with_aisle):,}")
    print(f"Products without aisle (need to check): {len(products_without_aisle):,}")
    
    # Products with aisle are definitely sold in-store, keep them all
    filtered_products = products_with_aisle.copy()
    
    # Check products without aisle
    print(f"\nChecking {len(products_without_aisle):,} products without aisle...")
    print("This may take a while...\n")
    
    removed_count = 0
    kept_count = 0
    error_count = 0
    
    def check_and_filter(product: Dict[str, Any]) -> tuple:
        """Check a product and return (product, should_keep, status)"""
        tcin = product.get('product_id') or product.get('tcin')
        if not tcin:
            return (product, False, 'no_tcin')
        
        result = check_product_availability(tcin)
        
        if result is False:
            return (product, False, 'not_sold_in_store')
        elif result is True:
            return (product, True, 'sold_in_store')
        else:
            return (product, False, 'error')
    
    # Process in batches with progress reporting
    batch_size = 100
    total_batches = (len(products_without_aisle) + batch_size - 1) // batch_size
    
    for batch_num in range(total_batches):
        batch = products_without_aisle[batch_num * batch_size:(batch_num + 1) * batch_size]
        
        print(f"Processing batch {batch_num + 1}/{total_batches} ({len(batch)} products)...")
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(check_and_filter, p): p for p in batch}
            
            for future in as_completed(futures):
                product, should_keep, status = future.result()
                
                if should_keep:
                    filtered_products.append(product)
                    kept_count += 1
                else:
                    if status == 'not_sold_in_store':
                        removed_count += 1
                    else:
                        error_count += 1
                
                # Progress update every 10 products
                total_checked = kept_count + removed_count + error_count
                if total_checked % 10 == 0:
                    print(f"  Progress: {total_checked:,}/{len(products_without_aisle):,} checked "
                          f"(kept: {kept_count:,}, removed: {removed_count:,}, errors: {error_count:,})")
        
        # Rate limiting between batches
        if batch_num + 1 < total_batches:
            time.sleep(1)
    
    print(f"\n{'=' * 60}")
    print("Filtering Complete!")
    print(f"{'=' * 60}")
    print(f"Original products: {len(products):,}")
    print(f"Products kept: {len(filtered_products):,}")
    print(f"Products removed (NOT_SOLD_IN_STORE): {removed_count:,}")
    print(f"Products removed (errors): {error_count:,}")
    print(f"Removed total: {len(products) - len(filtered_products):,}")
    
    # Update metadata
    metadata['total_products'] = len(filtered_products)
    metadata['products_with_upc'] = sum(1 for p in filtered_products if p.get('upc'))
    metadata['products_with_aisle'] = sum(1 for p in filtered_products if p.get('store_aisle'))
    metadata['filtered_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    metadata['removed_not_sold_in_store'] = removed_count
    
    # Save filtered products
    output_data = {
        'metadata': metadata,
        'products': filtered_products,
    }
    
    print(f"\nSaving filtered products to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2, default=str)
    
    print(f"✅ Saved {len(filtered_products):,} products to {output_file}")
    print(f"📊 File size: {os.path.getsize(output_file) / 1024 / 1024:.1f} MB")


if __name__ == '__main__':
    filter_products()

