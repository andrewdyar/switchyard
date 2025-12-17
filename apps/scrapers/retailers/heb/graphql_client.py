"""
HEB GraphQL API Client

This module provides a client for interacting with HEB's GraphQL API.
It handles CSRF protection headers and provides utilities for common operations.

Note: This is a proof-of-concept. Actual operation names and authentication
must be discovered through browser DevTools or app analysis.
"""

import requests
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class GraphQLResponse:
    """Container for GraphQL API responses."""
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[Dict[str, Any]]] = None
    success: bool = False


class HEBGraphQLClient:
    """
    Client for HEB's GraphQL API with CSRF protection handling.
    
    Usage:
        client = HEBGraphQLClient()
        response = client.query("query GetProducts { ... }")
    """
    
    def __init__(self, base_url: str = "https://www.heb.com/graphql"):
        """
        Initialize the HEB GraphQL client.
        
        Args:
            base_url: The GraphQL endpoint URL
        """
        self.base_url = base_url
        self.session = requests.Session()
        
        # Set default headers to bypass CSRF protection
        self.session.headers.update({
            'Content-Type': 'application/json',
            'x-apollo-operation-name': 'Query',  # Default, should be replaced with actual operation name
            'apollo-require-preflight': 'true',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.heb.com',
            'Referer': 'https://www.heb.com/',
        })
    
    def query(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: Optional[str] = None,
        extensions: Optional[Dict[str, Any]] = None
    ) -> GraphQLResponse:
        """
        Execute a GraphQL query.
        
        Args:
            query: The GraphQL query string
            variables: Optional variables for the query
            operation_name: The name of the GraphQL operation (required for CSRF bypass)
            extensions: Optional extensions (e.g., persisted query hash)
        
        Returns:
            GraphQLResponse object with data, errors, and success status
        """
        payload = {
            'query': query
        }
        
        if variables:
            payload['variables'] = variables
        
        if extensions:
            payload['extensions'] = extensions
        
        # Update operation name header if provided
        headers = {}
        if operation_name:
            headers['x-apollo-operation-name'] = operation_name
            # Also include in payload for Apollo Client compatibility
            payload['operationName'] = operation_name
        
        try:
            response = self.session.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            # Try to get JSON response even on error
            try:
                result = response.json()
            except:
                result = {}
            
            # Check HTTP status
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                if result.get('errors'):
                    error_msg += f": {result['errors']}"
                elif result.get('message'):
                    error_msg += f": {result['message']}"
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=[{'message': error_msg, 'status_code': response.status_code, 'response': result}],
                    success=False
                )
            
            # Check for GraphQL errors
            if 'errors' in result:
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=result['errors'],
                    success=False
                )
            
            return GraphQLResponse(
                data=result.get('data'),
                errors=None,
                success=True
            )
            
        except requests.exceptions.RequestException as e:
            return GraphQLResponse(
                data=None,
                errors=[{'message': str(e)}],
                success=False
            )
    
    def get_product_by_sku(self, sku: str, store_id: Optional[str] = None) -> GraphQLResponse:
        """
        Get product information by SKU.
        
        Note: This is a template - actual query structure must be discovered.
        
        Args:
            sku: Product SKU
            store_id: Optional store ID for location-specific data
        
        Returns:
            GraphQLResponse with product data
        """
        query = """
        query GetProductBySku($sku: String!, $storeId: String) {
            product(sku: $sku, storeId: $storeId) {
                id
                name
                sku
                price
                location {
                    aisle
                    section
                    shelf
                }
                inStock
            }
        }
        """
        
        variables = {'sku': sku}
        if store_id:
            variables['storeId'] = store_id
        
        return self.query(query, variables, operation_name='GetProductBySku')
    
    def get_shopping_list_v2(self, list_id: str) -> GraphQLResponse:
        """
        Get shopping list items with location data (V2 API).
        
        Based on actual HEB GraphQL API structure.
        
        Args:
            list_id: Shopping list ID (UUID)
        
        Returns:
            GraphQLResponse with shopping list data including product locations
        """
        # Input requires 'id' not 'listId' based on error message
        # Response structure matches addShoppingListItemsV2
        query = """
        query getShoppingListV2($input: GetShoppingListInputV2!) {
            getShoppingListV2(input: $input) {
                id
                name
                description
                fulfillment {
                    store {
                        storeNumber
                        name
                    }
                }
                itemPage {
                    items {
                        id
                        checked
                        quantity
                        groupHeader
                        itemPrice {
                            totalAmount
                            listPrice
                            salePrice
                        }
                        product {
                            id
                            fullDisplayName
                            thumbnailImageUrl
                            productImageUrls {
                                size
                                url
                            }
                            productLocation {
                                location
                            }
                            SKUs {
                                id
                                twelveDigitUPC
                                customerFriendlySize
                            }
                        }
                    }
                    thisPage {
                        page
                        size
                        totalCount
                        sort
                        sortDirection
                    }
                }
                total {
                    formattedPrice
                    price
                }
                totalItemCount
            }
        }
        """
        
        variables = {'input': {'id': list_id}}
        
        return self.query(query, variables, operation_name='getShoppingListV2')
    
    def add_to_shopping_list_v2(
        self,
        product_ids: List[str],
        list_id: str,
        quantities: Optional[List[int]] = None,
        sort: str = "STORE_LOCATION",
        sort_direction: str = "ASC"
    ) -> GraphQLResponse:
        """
        Add items to a shopping list using product IDs.
        
        Based on the actual addToShoppingListV2 mutation structure from HEB's API.
        Uses product.id (not SKU.id) - e.g., "325173" for celery.
        
        Args:
            product_ids: List of product IDs (e.g., ["325173", "1803322"])
            list_id: Shopping list ID (UUID)
            quantities: Optional list of quantities (defaults to 1 for each item)
            sort: Sort order for the list (default: "STORE_LOCATION" for most efficient route)
            sort_direction: Sort direction (default: "ASC")
        
        Returns:
            GraphQLResponse with updated shopping list data
        """
        if quantities is None:
            quantities = [1] * len(product_ids)
        
        if len(quantities) != len(product_ids):
            raise ValueError("quantities list must match length of product_ids")
        
        # Build listItems array - matches HEB's structure
        # listItems: [{ item: { productId: string } }]
        # Note: quantity is not in the item structure based on the actual API call
        list_items = [
            {"item": {"productId": pid}}
            for pid in product_ids
        ]
        
        mutation = """
        mutation addToShoppingListV2($input: AddToShoppingListInputV2!) {
            addToShoppingListV2(input: $input) {
                id
                name
                totalItemCount
                itemPage {
                    items {
                        id
                        quantity
                        product {
                            id
                            fullDisplayName
                            productLocation {
                                location
                            }
                        }
                    }
                    thisPage {
                        sort
                        sortDirection
                        totalCount
                    }
                }
                total {
                    formattedPrice
                    price
                }
            }
        }
        """
        
        # Build input structure matching HEB's API
        variables = {
            'input': {
                'listId': list_id,
                'listItems': list_items,
                'page': {
                    'sort': sort,
                    'sortDirection': sort_direction
                }
            }
        }
        
        # HEB uses Apollo persisted queries - send just the hash
        # The server will look up the query by hash
        extensions = {
            'persistedQuery': {
                'version': 1,
                'sha256Hash': '6b1534f6270004656ac14944f790a993822fba67fe24c9558713016cea2217c8'
            }
        }
        
        # For persisted queries, we can send just the hash without the full query
        # If the hash isn't found, the server will ask for the full query
        payload = {
            'operationName': 'addToShoppingListV2',
            'variables': variables,
            'extensions': extensions
        }
        
        headers = {
            'x-apollo-operation-name': 'addToShoppingListV2'
        }
        
        try:
            response = self.session.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            # Try to get JSON response even on error
            try:
                result = response.json()
            except:
                result = {}
            
            # Check HTTP status
            if response.status_code != 200:
                error_msg = f"{response.status_code} {response.reason}"
                if result.get('errors'):
                    error_msg += f": {result['errors']}"
                elif result.get('message'):
                    error_msg += f": {result['message']}"
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=[{'message': error_msg, 'status_code': response.status_code, 'response': result}],
                    success=False
                )
            
            # Check for GraphQL errors
            if 'errors' in result:
                return GraphQLResponse(
                    data=result.get('data'),
                    errors=result['errors'],
                    success=False
                )
            
            return GraphQLResponse(
                data=result.get('data'),
                errors=None,
                success=True
            )
            
        except requests.exceptions.RequestException as e:
            return GraphQLResponse(
                data=None,
                errors=[{'message': str(e)}],
                success=False
            )
    
    def get_store_locations(self, zip_code: Optional[str] = None) -> GraphQLResponse:
        """
        Get available store locations.
        
        Note: This is a template - actual query structure must be discovered.
        
        Args:
            zip_code: Optional zip code to filter stores
        
        Returns:
            GraphQLResponse with store location data
        """
        query = """
        query GetStoreLocations($zipCode: String) {
            stores(zipCode: $zipCode) {
                id
                name
                address
                city
                state
                zipCode
                phone
            }
        }
        """
        
        variables = {}
        if zip_code:
            variables['zipCode'] = zip_code
        
        return self.query(query, variables, operation_name='GetStoreLocations')


def test_connection():
    """
    Test basic connection to HEB GraphQL API.
    This will likely fail without proper authentication, but demonstrates
    that CSRF headers are working.
    """
    client = HEBGraphQLClient()
    
    # Simple introspection query (if enabled)
    query = """
    query {
        __schema {
            queryType {
                name
            }
        }
    }
    """
    
    print("Testing HEB GraphQL API connection...")
    print(f"Endpoint: {client.base_url}")
    print(f"Headers: {dict(client.session.headers)}")
    print("\nSending test query...")
    
    response = client.query(query, operation_name='IntrospectionQuery')
    
    if response.success:
        print("✅ Connection successful!")
        print(f"Response: {json.dumps(response.data, indent=2)}")
    else:
        print("❌ Connection failed or requires authentication")
        if response.errors:
            print(f"Errors: {json.dumps(response.errors, indent=2)}")
        else:
            print("No error details available")
    
    return response


if __name__ == "__main__":
    # Run connection test
    test_connection()
    
    print("\n" + "="*60)
    print("Next Steps:")
    print("1. Use browser DevTools to capture actual GraphQL operations")
    print("2. Update query structures with real operation names")
    print("3. Handle authentication (cookies, tokens, etc.)")
    print("4. Test with actual SKUs and store IDs")
    print("="*60)

