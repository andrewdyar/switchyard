# HEB GraphQL API Discovery Guide

This guide explains how to discover the actual GraphQL operations, queries, and mutations used by HEB's website and mobile app.

## Method 1: Browser DevTools (Recommended)

### Step 1: Open Browser DevTools
1. Navigate to `https://www.heb.com`
2. Open DevTools (F12 or Cmd+Option+I on Mac)
3. Go to the **Network** tab
4. Filter by **Fetch/XHR** or search for **graphql**

### Step 2: Interact with the Website
Perform actions that would trigger GraphQL queries:
- Search for a product
- View a product detail page
- Add items to shopping list
- View shopping list
- Change store location
- View cart

### Step 3: Capture GraphQL Requests
For each GraphQL request you see:

1. **Click on the request** in the Network tab
2. **Headers Tab:** Note:
   - `x-apollo-operation-name` value
   - `Content-Type` (should be `application/json`)
   - Any authentication headers (cookies, tokens, etc.)
   - `Referer` and `Origin` headers

3. **Payload Tab:** Copy:
   - The full GraphQL query/mutation
   - Variables being sent
   - Operation name

4. **Response Tab:** Note:
   - Response structure
   - Error messages (if any)
   - Data format

### Step 4: Document Operations

Create a mapping of operations:

```python
HEB_OPERATIONS = {
    'product_search': {
        'operation_name': 'SearchProducts',
        'query': 'query SearchProducts($query: String!) { ... }',
        'variables': {'query': 'milk'}
    },
    'get_product': {
        'operation_name': 'GetProduct',
        'query': 'query GetProduct($id: String!) { ... }',
        'variables': {'id': '12345'}
    },
    'get_shopping_list': {
        'operation_name': 'GetShoppingList',
        'query': 'query GetShoppingList { ... }',
        'variables': {}
    },
    # ... etc
}
```

## Method 2: Browser Console Interception

### Inject Script to Capture GraphQL Calls

Open browser console and paste:

```javascript
// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (url && url.includes('/graphql')) {
        console.group('🔍 GraphQL Request');
        console.log('URL:', url);
        console.log('Headers:', options.headers);
        console.log('Body:', options.body);
        console.groupEnd();
    }
    
    return originalFetch.apply(this, args);
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(body) {
    if (this._url && this._url.includes('/graphql')) {
        console.group('🔍 GraphQL XHR Request');
        console.log('URL:', this._url);
        console.log('Method:', this._method);
        console.log('Headers:', this.getAllResponseHeaders());
        console.log('Body:', body);
        console.groupEnd();
    }
    return originalXHRSend.apply(this, [body]);
};
```

## Method 3: Mobile App Analysis

### Android App
1. Install Android Studio
2. Use Android Debug Bridge (ADB) to capture network traffic:
   ```bash
   adb shell "tcpdump -i any -p -s 0 -w /sdcard/capture.pcap"
   ```
3. Use Wireshark or Charles Proxy to analyze traffic

### iOS App
1. Use **Charles Proxy** or **Proxyman** to intercept HTTPS traffic
2. Install SSL certificate on device
3. Monitor all network requests from the HEB app
4. Filter for GraphQL endpoints

## Method 4: Source Code Analysis

### Web App
1. View page source or inspect bundled JavaScript
2. Search for GraphQL query strings:
   ```bash
   # In browser console
   Object.keys(window).filter(k => k.includes('graphql') || k.includes('apollo'))
   ```
3. Look for Apollo Client configuration
4. Search for `.graphql` or `.gql` files in source maps

## Key Operations to Look For

### Product Operations
- `SearchProducts` - Search for products
- `GetProduct` - Get product details
- `GetProductLocation` - Get aisle/section information
- `GetProductAvailability` - Check stock at store

### Shopping List Operations
- `GetShoppingList` - Retrieve shopping list
- `CreateShoppingList` - Create new list
- `AddItemToList` - Add item to list
- `RemoveItemFromList` - Remove item
- `UpdateItemQuantity` - Update quantity
- `GetOptimizedShoppingPath` - Get optimized route (if available)

### Store Operations
- `GetStores` - List available stores
- `GetStoreDetails` - Get store information
- `SetStore` - Set active store
- `GetStoreLayout` - Get store map/layout (if available)

### Cart Operations
- `GetCart` - Get cart contents
- `AddToCart` - Add item to cart
- `UpdateCartItem` - Update cart item

## Authentication Discovery

Look for:
1. **Cookies:** Check `Set-Cookie` headers in responses
2. **Tokens:** Look for `Authorization` headers or tokens in request payloads
3. **Session IDs:** May be in cookies or headers
4. **CSRF Tokens:** May be required in addition to operation name

### Common Patterns:
```python
# Cookie-based auth
session.cookies.set('session_id', '...')
session.cookies.set('csrf_token', '...')

# Token-based auth
headers['Authorization'] = 'Bearer <token>'

# Session-based
headers['X-Session-ID'] = '...'
```

## Example: Capturing a Real Query

1. **Open HEB.com** in browser
2. **Open DevTools → Network**
3. **Search for "milk"**
4. **Find the GraphQL request** (filter by "graphql")
5. **Copy the request details:**

```json
{
  "operationName": "SearchProducts",
  "query": "query SearchProducts($query: String!, $storeId: String) { ... }",
  "variables": {
    "query": "milk",
    "storeId": "123"
  }
}
```

6. **Note the headers:**
```
x-apollo-operation-name: SearchProducts
Content-Type: application/json
Cookie: session=...; csrf=...
```

7. **Update `heb_graphql_client.py`** with the real operation

## Testing Discovered Operations

Once you've captured an operation:

```python
from heb_graphql_client import HEBGraphQLClient

client = HEBGraphQLClient()

# Use the real operation name and query
response = client.query(
    query="""
    query SearchProducts($query: String!) {
        searchProducts(query: $query) {
            id
            name
            sku
            price
            location {
                aisle
                section
            }
        }
    }
    """,
    variables={'query': 'milk'},
    operation_name='SearchProducts'
)

if response.success:
    print(response.data)
else:
    print(response.errors)
```

## Automation Script

Create a script to automatically capture operations:

```python
# capture_heb_operations.py
from selenium import webdriver
from selenium.webdriver.common.by import By
import json
import time

driver = webdriver.Chrome()
driver.get('https://www.heb.com')

# Enable performance logging
driver.execute_cdp_cmd('Performance.enable', {})

# Perform actions
search_box = driver.find_element(By.ID, 'search')
search_box.send_keys('milk')
search_box.submit()

time.sleep(2)

# Get performance logs
logs = driver.get_log('performance')
for log in logs:
    message = json.loads(log['message'])
    if 'Network.requestWillBeSent' in message['message']['method']:
        request = message['message']['params']['request']
        if '/graphql' in request.get('url', ''):
            print(json.dumps(request, indent=2))
```

## Next Steps After Discovery

1. **Document all operations** in a structured format
2. **Test each operation** with the Python client
3. **Handle authentication** properly
4. **Build wrapper functions** for common operations
5. **Create SKU import functionality**
6. **Implement shopping path optimization** (if location data is available)

## Troubleshooting

### Still Getting CSRF Errors?
- Ensure `Content-Type: application/json`
- Verify `x-apollo-operation-name` matches the operation name in the query
- Check that `apollo-require-preflight` is set if needed

### Getting Authentication Errors?
- Capture cookies from browser session
- Look for authentication tokens in headers
- May need to log in first and maintain session

### Getting 400/500 Errors?
- Verify query syntax matches exactly
- Check that variables match expected types
- Ensure operation name is correct

### Rate Limited?
- Add delays between requests
- Use session pooling
- Consider using proxies (if allowed by ToS)

