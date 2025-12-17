#!/usr/bin/env python3
"""
Process Dollar Tree JSON response file and extract products.

This script processes the dollartree_response.json file and extracts
all products with their UPCs for arbitrage matching.
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_first(value_list: List) -> Optional[Any]:
    """Get first value from list, or None if empty."""
    return value_list[0] if value_list else None

def extract_product(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract product data from a record matching unified schema."""
    try:
        attributes = record.get('attributes', {})
        
        # external_id (product.id) - required
        product_id = get_first(attributes.get('product.id', []))
        if not product_id:
            return None
        
        # barcode (UPC) - critical for arbitrage matching
        upcs = attributes.get('DollarProductType.UPCs', [])
        barcode = get_first(upcs)
        if barcode:
            barcode = barcode.lstrip('0') or barcode
        
        # name (product.displayName)
        display_name = get_first(attributes.get('product.displayName', []))
        description = get_first(attributes.get('product.description', []))
        name = display_name or description
        if not name:
            return None
        
        # brand (if available)
        brand = get_first(attributes.get('product.brand', [])) or \
               get_first(attributes.get('brand.name', []))
        
        # cost_price (sku.activePrice)
        price_str = get_first(attributes.get('sku.activePrice', []))
        cost_price = float(price_str) if price_str else None
        
        # list_price (product.listPrice)
        list_price_str = get_first(attributes.get('product.listPrice', []))
        list_price = float(list_price_str) if list_price_str else None
        
        # price_per_unit (product.x_unitprice)
        unit_price_str = get_first(attributes.get('product.x_unitprice', []))
        price_per_unit = None
        if unit_price_str:
            try:
                price_per_unit = float(unit_price_str.replace('$', '').strip())
            except (ValueError, AttributeError):
                pass
        
        # size
        size = get_first(attributes.get('product.weightDimension', []))
        
        # image_url
        primary_image = get_first(attributes.get('product.primaryFullImageURL', []))
        image_url = None
        if primary_image:
            if not primary_image.startswith('http'):
                image_url = f"https://www.dollartree.com{primary_image}"
            else:
                image_url = primary_image
        
        # rating
        rating_str = get_first(attributes.get('DollarProductType.averageRating', []))
        rating = float(rating_str) if rating_str else None
        
        # review_count
        review_count_str = get_first(attributes.get('DollarProductType.numberOfReviews', []))
        review_count = int(review_count_str) if review_count_str else None
        
        # Additional fields
        category = get_first(attributes.get('product.category', []))
        parent_categories = attributes.get('parentCategory.displayName', [])
        route = get_first(attributes.get('product.route', []))
        product_url = f"https://www.dollartree.com{route}" if route else None
        
        return {
            # Unified schema fields (per retailer-scraping-guide.md)
            'external_id': product_id,
            'barcode': barcode,
            'name': name,
            'brand': brand,
            'cost_price': cost_price,
            'list_price': list_price,
            'price_per_unit': price_per_unit,
            'price_per_unit_uom': None,
            'size': size,
            'image_url': image_url,
            'rating': rating,
            'review_count': review_count,
            
            # Additional Dollar Tree specific fields
            'category': category,
            'parent_categories': parent_categories,
            'product_url': product_url,
            'description': description,
            'long_description': get_first(attributes.get('product.longDescription', [])),
            'availability': get_first(attributes.get('sku.availabilityStatus', [])),
            'raw_data': record,
        }
    except Exception as e:
        print(f"Error extracting product: {e}", file=sys.stderr)
        return None

def process_json_file(input_file: str, output_file: str):
    """Process Dollar Tree JSON response and extract products."""
    print(f"Loading products from {input_file}...")
    
    with open(input_file) as f:
        data = json.load(f)
    
    results = data.get('resultsList', {})
    records = results.get('records', [])
    total = results.get('totalNumRecs', 0)
    
    print(f"Found {len(records)} records on this page")
    print(f"Total records: {total}")
    print("Extracting products...")
    
    products = []
    for record in records:
        # Records are nested
        inner_records = record.get('records', [])
        if inner_records:
            for inner_record in inner_records:
                product = extract_product(inner_record)
                if product:
                    products.append(product)
        else:
            product = extract_product(record)
            if product:
                products.append(product)
    
    # Save to output file
    output = {
        'metadata': {
            'retailer': 'dollar_tree',
            'source_file': input_file,
            'processed_at': datetime.utcnow().isoformat(),
            'total_products': len(products),
            'products_with_upc': sum(1 for p in products if p.get('barcode')),
            'total_records_in_file': len(records),
            'total_records_expected': total,
        },
        'products': products,
    }
    
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2, default=str)
    
    print(f"\n✅ Extracted {len(products)} products")
    print(f"   Products with UPC: {sum(1 for p in products if p.get('barcode'))}")
    print(f"   Saved to: {output_file}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Process Dollar Tree JSON response')
    parser.add_argument('--input', '-i', default='dollartree_response.json',
                       help='Input JSON file (default: dollartree_response.json)')
    parser.add_argument('--output', '-o', default='dt_products.json',
                       help='Output JSON file (default: dt_products.json)')
    
    args = parser.parse_args()
    
    process_json_file(args.input, args.output)

