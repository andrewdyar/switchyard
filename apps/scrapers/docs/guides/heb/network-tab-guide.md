# How to Find GraphQL Requests in Network Tab

## The Problem

When you look at the Network tab, you see fetch/preflight requests with generic names like `{} 0` or `0`. This is because the browser doesn't show the full URL or operation name in the list view.

## Solution: Click on the Requests

### Step 1: Find the GraphQL Requests

1. In the Network tab, look for requests with:
   - **Type:** `fetch` or `preflight`
   - **Name:** Generic like `{} 0`, `0`, or blank
   - **Size:** Usually small (0.5-2 KB)

2. **Click on one of these requests** to open the details panel

### Step 2: Check the Request URL

In the details panel, look at the top:
- **Request URL:** Should show `https://www.heb.com/graphql` or similar
- If it's not a GraphQL endpoint, try another request

### Step 3: View Headers Tab

Click on the **Headers** tab in the details panel:

Look for:
- **Request Headers:**
  - `x-apollo-operation-name: <OperationName>` ← This is what you need!
  - `Content-Type: application/json`
  - `apollo-require-preflight: true` (if present)
  - Any authentication headers (cookies, tokens)

### Step 4: View Payload Tab

Click on the **Payload** tab (or "Request" tab):

You'll see:
```json
{
  "operationName": "SearchProducts",
  "query": "query SearchProducts($query: String!) { ... }",
  "variables": {
    "query": "milk"
  }
}
```

**Copy this entire payload!**

### Step 5: View Response Tab

Click on the **Response** tab to see:
- The data structure returned
- Field names available
- How location data is structured (if present)

## Alternative: Use the Capture Tool

I've created `capture_heb_requests.html` - a tool that automatically captures GraphQL requests:

1. **Open the HTML file** in your browser
2. **Click "Start Capturing"**
3. **Open HEB.com in another tab**
4. **Interact with HEB.com** (search, view lists, etc.)
5. **Go back to the capture tool** to see all GraphQL requests

This tool will show:
- Operation names
- Full queries
- Headers
- Variables

## Filtering Tips

### In Chrome DevTools:

1. **Filter by URL:**
   - Type `graphql` in the filter box
   - Only GraphQL requests will show

2. **Filter by Type:**
   - Click the filter icon
   - Select "Fetch/XHR"
   - This shows only API requests

3. **Filter by Domain:**
   - Type `heb.com` in the filter
   - Shows only requests to HEB domain

### In Firefox DevTools:

1. **Filter by URL:**
   - Type `graphql` in the search box

2. **Filter by Type:**
   - Use the filter dropdown
   - Select "XHR" or "Fetch"

## What to Look For

### Common GraphQL Operations:

1. **Product Search:**
   - Operation: `SearchProducts` or `ProductSearch`
   - Triggered by: Searching for products
   - Look for: Product data, SKUs, prices

2. **Shopping List:**
   - Operation: `GetShoppingList` or `ShoppingList`
   - Triggered by: Viewing shopping list
   - Look for: List items, product info, location data

3. **Product Details:**
   - Operation: `GetProduct` or `ProductDetails`
   - Triggered by: Clicking on a product
   - Look for: Full product info, location (aisle/section)

4. **Store Info:**
   - Operation: `GetStore` or `StoreDetails`
   - Triggered by: Changing store or viewing store info
   - Look for: Store ID, layout info

## Quick Checklist

When you find a GraphQL request, capture:

- [ ] **Operation Name** (from `x-apollo-operation-name` header or `operationName` in payload)
- [ ] **Full Query** (from Payload tab)
- [ ] **Variables** (from Payload tab)
- [ ] **Headers** (especially authentication)
- [ ] **Response Structure** (from Response tab)
- [ ] **URL** (should be `/graphql`)

## Example: What You Should See

### In Headers Tab:
```
Request Headers:
  x-apollo-operation-name: SearchProducts
  Content-Type: application/json
  Cookie: session=abc123...
  Referer: https://www.heb.com/
```

### In Payload Tab:
```json
{
  "operationName": "SearchProducts",
  "query": "query SearchProducts($query: String!, $storeId: String) {\n  searchProducts(query: $query, storeId: $storeId) {\n    id\n    name\n    sku\n    price\n    location {\n      aisle\n      section\n    }\n  }\n}",
  "variables": {
    "query": "milk",
    "storeId": "123"
  }
}
```

### In Response Tab:
```json
{
  "data": {
    "searchProducts": [
      {
        "id": "12345",
        "name": "H-E-B Select Ingredients Whole Milk",
        "sku": "000123456",
        "price": 3.98,
        "location": {
          "aisle": "Dairy",
          "section": "A1"
        }
      }
    ]
  }
}
```

## Still Not Seeing GraphQL Requests?

1. **Clear the Network tab** (trash icon) and try again
2. **Disable cache** (checkbox in Network tab)
3. **Try different actions:**
   - Search for a product
   - Add item to cart
   - View shopping list
   - Change store location
4. **Check if you're logged in** (some requests may require authentication)
5. **Try incognito mode** (to rule out extensions interfering)

## Next Steps

Once you've captured a request:

1. **Save the details** (copy/paste or use the export tool)
2. **Update `heb_graphql_client.py`** with the real operation
3. **Test it** with the Python client
4. **Repeat** for other operations you need

Good luck! 🎯

