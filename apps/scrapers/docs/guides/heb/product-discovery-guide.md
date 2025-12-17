# HEB Product Query Discovery Guide

## Current Situation

HEB doesn't expose a simple "get all products" GraphQL endpoint. Products are loaded through:
- Search queries (when typing in search bar)
- Category browsing (when clicking category links)
- Product listings on department pages

## Discovery Strategy

### Step 1: Find Search Query (Easiest First Step)

1. **Open HEB.com in browser** with DevTools Network tab open
2. **Clear the network log** (click the clear button)
3. **Type a product in the search bar** (e.g., "milk")
4. **Look for GraphQL requests** that appear after typing
5. **Click on the request** and check:
   - Payload tab: What's the `operationName`?
   - What `variables` are sent?
   - What's the query structure?
   - Is there a persisted query hash in `extensions`?

**Expected operations:**
- `searchProducts`
- `productSearch`
- `search`
- `products`

### Step 2: Find Category/Department Browse Query

1. **Navigate to a category page** (e.g., click "Produce" or "Meat & Seafood")
2. **Watch the Network tab** as the page loads
3. **Look for GraphQL requests** that load product listings
4. **Check the Payload** for:
   - `operationName`
   - Variables (likely includes `categoryId` or `departmentId`)
   - Query structure

**Expected operations:**
- `getCategoryProducts`
- `browseCategory`
- `departmentProducts`
- `categoryBrowse`

### Step 3: Find Product List Pagination

When you're on a category page or search results:
1. **Scroll down** to load more products
2. **Or click "Load More" / "Next Page"**
3. **Watch for GraphQL requests** triggered by pagination
4. **Note the pagination variables** (page number, pageSize, cursor, etc.)

### Step 4: Capture Full Query Details

For each discovered query, capture:

```json
{
  "operationName": "...",
  "query": "query ...",
  "variables": {...},
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "..."
    }
  }
}
```

## What to Look For

### In Network Tab:
- Requests to `/graphql` endpoint
- Orange `{}` icon indicating GraphQL
- Requests triggered by user actions (search, click category, scroll)

### In Payload Tab:
- `operationName`: The GraphQL operation name
- `variables`: Input parameters (search term, category ID, pagination, storeId)
- `query`: The full GraphQL query (if not using persisted queries)
- `extensions.persistedQuery.sha256Hash`: Hash for persisted queries

### In Response Tab:
- Structure of returned data
- What fields are available (id, name, price, images, etc.)
- Pagination metadata (hasMore, totalCount, etc.)

## Alternative Discovery Methods

### Method 1: Use Existing Shopping List Query

If you have a shopping list with products, you already have `getShoppingListV2` which returns products. We could:
1. Manually add products to a shopping list via the UI
2. Query that list to get product IDs
3. Then query individual products or use those IDs to discover more

### Method 2: Inspect JavaScript Source

1. In DevTools, go to **Sources** tab
2. Search for terms like "searchProducts", "product", "query"
3. Find where GraphQL queries are defined in the frontend code
4. Extract query definitions

### Method 3: API Exploration

Some GraphQL APIs support introspection. Try:

```python
query = """
query IntrospectionQuery {
  __schema {
    queryType {
      name
      fields {
        name
        description
        args {
          name
          type {
            name
          }
        }
      }
    }
  }
}
"""
```

## Next Steps After Discovery

Once you find a working query:

1. **Test it with `heb_graphql_client.py`**
2. **Update `heb_product_scraper.py`** with the real query
3. **Test pagination** - see how to get page 2, 3, etc.
4. **Test with storeId: 202** - verify it works with your store
5. **Test with different search terms/categories**

## Expected Query Structure

Based on common e-commerce patterns, expect something like:

```graphql
query searchProducts($query: String!, $storeId: String, $page: Int, $pageSize: Int) {
  searchProducts(query: $query, storeId: $storeId, page: $page, pageSize: $pageSize) {
    products {
      id
      name
      price
      imageUrl
      # ... more fields
    }
    pagination {
      totalCount
      hasMore
      page
      pageSize
    }
  }
}
```

Or for categories:

```graphql
query browseCategory($categoryId: String!, $storeId: String, $page: Int) {
  browseCategory(categoryId: $categoryId, storeId: $storeId, page: $page) {
    products {
      # ... product fields
    }
    # ... pagination
  }
}
```

## Testing Checklist

After discovering a query:

- [ ] Does it work with storeId: 202?
- [ ] Does pagination work (page 1, 2, 3...)?
- [ ] What's the max pageSize?
- [ ] What fields are available on products?
- [ ] Does it work with cookies from your session?
- [ ] Are there any required headers (CSRF tokens, etc.)?

## Quick Test Command

Once you have a working query, test it:

```python
python3 heb_graphql_client.py
# Or modify test_connection() to test your specific query
```

---

**Note:** If HEB uses Apollo Client persisted queries, you'll see a hash in `extensions.persistedQuery.sha256Hash`. The client might only send the hash, not the full query. In that case, you may need to:
1. Send the hash alone (and the server looks it up)
2. Or send both hash + full query on first request

