"""
Test HEB GraphQL Query

Use this script to test discovered GraphQL queries.
Once you capture a query from the browser DevTools, add it here to test.
"""

import os
import json
import sys
from heb_graphql_client import HEBGraphQLClient

def test_query():
    """Test a GraphQL query."""
    client = HEBGraphQLClient()
    
    # Get cookies from environment if available
    cookies = os.getenv('HEB_COOKIES')
    if cookies:
        # Parse and set cookies
        cookie_dict = {}
        for cookie in cookies.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                cookie_dict[key.strip()] = value.strip()
        client.session.cookies.update(cookie_dict)
        print("✅ Cookies loaded from environment")
    else:
        print("⚠️  No cookies found - requests may fail without authentication")
    
    # Get store ID from environment
    store_id = os.getenv('HEB_STORE_ID', '202')
    print(f"📍 Using store ID: {store_id}\n")
    
    # =================================================================
    # ADD YOUR DISCOVERED QUERY HERE
    # =================================================================
    
    # Example: Search query (REPLACE WITH ACTUAL DISCOVERED QUERY)
    operation_name = "searchProducts"  # ← Replace with actual operation name
    
    query = """
    query searchProducts($query: String!, $storeId: String, $page: Int, $pageSize: Int) {
        searchProducts(query: $query, storeId: $storeId, page: $page, pageSize: $pageSize) {
            products {
                id
                name
                price
                imageUrl
            }
            pagination {
                totalCount
                hasMore
                page
            }
        }
    }
    """  # ← Replace with actual query structure
    
    variables = {
        'query': 'milk',
        'storeId': store_id,
        'page': 0,
        'pageSize': 20
    }  # ← Replace with actual variables
    
    # Persisted query hash (if using persisted queries)
    extensions = None  # ← Add if you found a hash in extensions.persistedQuery.sha256Hash
    # Example:
    # extensions = {
    #     'persistedQuery': {
    #         'version': 1,
    #         'sha256Hash': 'your_hash_here'
    #     }
    # }
    
    # =================================================================
    
    print(f"🧪 Testing query: {operation_name}")
    print(f"📋 Variables: {json.dumps(variables, indent=2)}")
    print("\n" + "="*60 + "\n")
    
    # Send query
    response = client.query(
        query=query,
        variables=variables,
        operation_name=operation_name,
        extensions=extensions
    )
    
    # Display results
    if response.success:
        print("✅ Query successful!")
        print(f"\n📦 Response data:")
        print(json.dumps(response.data, indent=2))
    else:
        print("❌ Query failed!")
        print(f"\n🚨 Errors:")
        print(json.dumps(response.errors, indent=2))
        print(f"\n📦 Response data (if any):")
        if response.data:
            print(json.dumps(response.data, indent=2))
    
    return response


def test_category_query():
    """Test a category browse query."""
    client = HEBGraphQLClient()
    
    # Get cookies from environment if available
    cookies = os.getenv('HEB_COOKIES')
    if cookies:
        cookie_dict = {}
        for cookie in cookies.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                cookie_dict[key.strip()] = value.strip()
        client.session.cookies.update(cookie_dict)
        print("✅ Cookies loaded")
    
    store_id = os.getenv('HEB_STORE_ID', '202')
    print(f"📍 Using store ID: {store_id}\n")
    
    # =================================================================
    # ADD YOUR DISCOVERED CATEGORY QUERY HERE
    # =================================================================
    
    operation_name = "browseCategory"  # ← Replace with actual operation name
    
    query = """
    query browseCategory($categoryId: String!, $storeId: String, $page: Int) {
        browseCategory(categoryId: $categoryId, storeId: $storeId, page: $page) {
            products {
                id
                name
                price
            }
            pagination {
                totalCount
                hasMore
            }
        }
    }
    """  # ← Replace with actual query
    
    variables = {
        'categoryId': '1',  # ← Replace with actual category ID
        'storeId': store_id,
        'page': 0
    }
    
    extensions = None  # ← Add persisted query hash if found
    
    # =================================================================
    
    print(f"🧪 Testing category query: {operation_name}")
    print(f"📋 Variables: {json.dumps(variables, indent=2)}")
    print("\n" + "="*60 + "\n")
    
    response = client.query(
        query=query,
        variables=variables,
        operation_name=operation_name,
        extensions=extensions
    )
    
    if response.success:
        print("✅ Query successful!")
        print(f"\n📦 Response data:")
        print(json.dumps(response.data, indent=2))
    else:
        print("❌ Query failed!")
        print(f"\n🚨 Errors:")
        print(json.dumps(response.errors, indent=2))
    
    return response


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Test HEB GraphQL queries')
    parser.add_argument('--type', choices=['search', 'category'], default='search',
                       help='Type of query to test (default: search)')
    
    args = parser.parse_args()
    
    print("="*60)
    print("HEB GraphQL Query Tester")
    print("="*60)
    print("\n⚠️  This script uses template queries.")
    print("   Add your discovered queries from the browser DevTools!")
    print("   See HEB_PRODUCT_DISCOVERY_GUIDE.md for instructions.\n")
    
    if args.type == 'search':
        test_query()
    else:
        test_category_query()

