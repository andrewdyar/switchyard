#!/usr/bin/env python3
"""Temporary script to inspect the actual structure of HEB API product responses."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from heb_product_scraper import HEBProductScraper
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get cookies from environment
cookies = os.getenv('HEB_COOKIES')

# Initialize scraper
scraper = HEBProductScraper(store_id="202", cookies=cookies, dry_run=True)

# Try to get one product from a category to see the structure
try:
    # Get products from a small category (Milk)
    response = scraper.get_products_from_category_api(
        "/category/shop/dairy-eggs/milk/490016/490053",
        page=1
    )
    
    if response.get('success') and response.get('data'):
        products = response['data']['searchProducts']['products']
        if products:
            # Print the first product's full structure
            first_product = products[0]
            print("=" * 80)
            print("SAMPLE PRODUCT STRUCTURE FROM HEB API:")
            print("=" * 80)
            print(json.dumps(first_product, indent=2, default=str))
            print("=" * 80)
            print("\n\nKEYS IN PRODUCT OBJECT:")
            print("=" * 80)
            for key in sorted(first_product.keys()):
                value = first_product[key]
                value_type = type(value).__name__
                if isinstance(value, (dict, list)):
                    if isinstance(value, dict):
                        print(f"{key}: {value_type} with keys: {list(value.keys())[:10]}")
                    else:
                        print(f"{key}: {value_type} (length: {len(value)})")
                        if value and isinstance(value[0], dict):
                            print(f"  First item keys: {list(value[0].keys())[:10]}")
                else:
                    val_str = str(value)
                    if len(val_str) > 100:
                        val_str = val_str[:100] + "..."
                    print(f"{key}: {value_type} = {val_str}")
            
            # Also show SKU structure in detail
            if 'SKUs' in first_product and first_product['SKUs']:
                print("\n\nSKU STRUCTURE (first SKU):")
                print("=" * 80)
                first_sku = first_product['SKUs'][0]
                print(json.dumps(first_sku, indent=2, default=str))
        else:
            print("No products found in response")
    else:
        print(f"Failed to get products: {response.get('errors')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
