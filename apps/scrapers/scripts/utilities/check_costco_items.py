#!/usr/bin/env python3
"""
Check if Costco items from Fusion API response are in Supabase database.
"""

import json
import sys
from supabase_client import get_client

def extract_item_numbers(response_data):
    """Extract item numbers from Costco Fusion API response."""
    items = []
    docs = response_data.get('response', {}).get('docs', [])
    
    for doc in docs:
        item_number = doc.get('item_number') or doc.get('item_location_itemNumber')
        item_name = doc.get('item_product_name') or doc.get('name', 'Unknown')
        location = doc.get('item_location_locationNumber', 'unknown')
        
        if item_number:
            items.append({
                'item_number': str(item_number),
                'name': item_name,
                'location': location
            })
    
    return items

def check_items_in_database(item_numbers, location_number):
    """Check which items exist in Supabase database."""
    supabase = get_client()
    
    # Query product_store_mappings for these items
    store_name = f'costco-{location_number}'
    
    results = {
        'found': [],
        'missing': [],
        'errors': []
    }
    
    for item in item_numbers:
        item_number = item['item_number']
        try:
            # Query for this specific item
            response = supabase.table('product_store_mappings').select(
                'id,product_id,store_item_id,is_active'
            ).eq('store_name', store_name).eq('store_item_id', item_number).execute()
            
            if response.data and len(response.data) > 0:
                mapping = response.data[0]
                results['found'].append({
                    'item_number': item_number,
                    'name': item['name'],
                    'mapping_id': mapping['id'],
                    'product_id': mapping['product_id'],
                    'is_active': mapping['is_active']
                })
            else:
                results['missing'].append({
                    'item_number': item_number,
                    'name': item['name']
                })
        except Exception as e:
            results['errors'].append({
                'item_number': item_number,
                'name': item['name'],
                'error': str(e)
            })
    
    return results

def main():
    # Read JSON from stdin or file
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)
    
    # Extract location from first item
    docs = data.get('response', {}).get('docs', [])
    if not docs:
        print("No items found in response")
        return
    
    location_number = docs[0].get('item_location_locationNumber', 'unknown')
    print(f"Location: {location_number}")
    print(f"Total items in response: {len(docs)}")
    print(f"numFound: {data.get('response', {}).get('numFound', 'unknown')}")
    print("=" * 80)
    
    # Extract item numbers
    items = extract_item_numbers(data)
    print(f"\nExtracted {len(items)} item numbers to check")
    
    # Check in database
    print("\nChecking items in Supabase database...")
    results = check_items_in_database(items, location_number)
    
    # Print results
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    print(f"\n✅ Found in database: {len(results['found'])}")
    print(f"❌ Missing from database: {len(results['missing'])}")
    if results['errors']:
        print(f"⚠️  Errors: {len(results['errors'])}")
    
    if results['missing']:
        print("\n" + "-" * 80)
        print("MISSING ITEMS:")
        print("-" * 80)
        for item in results['missing']:
            print(f"  - {item['item_number']}: {item['name'][:60]}")
    
    if results['errors']:
        print("\n" + "-" * 80)
        print("ERRORS:")
        print("-" * 80)
        for item in results['errors']:
            print(f"  - {item['item_number']}: {item['error']}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total = len(items)
    found = len(results['found'])
    missing = len(results['missing'])
    print(f"Total items checked: {total}")
    print(f"Found: {found} ({found/total*100:.1f}%)")
    print(f"Missing: {missing} ({missing/total*100:.1f}%)")
    
    # Check active status
    if results['found']:
        active_count = sum(1 for item in results['found'] if item['is_active'])
        inactive_count = len(results['found']) - active_count
        print(f"\nActive mappings: {active_count}")
        print(f"Inactive mappings: {inactive_count}")

if __name__ == '__main__':
    main()

