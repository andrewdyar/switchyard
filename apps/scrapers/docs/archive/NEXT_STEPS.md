# Next Steps for HEB Product Scraper

## Current Status ✅

1. **Scraper is optimized**:
   - ✅ Dry-run mode works (can test without Supabase)
   - ✅ Store ID 202 is being passed correctly
   - ✅ Error handling improved
   - ✅ Rate limiting configured

2. **Scraper ran successfully** (structure-wise):
   - ✅ Initialized with store ID 202
   - ✅ Making GraphQL requests
   - ❌ **Queries are failing** because template queries don't match HEB's actual API

## The Problem ❌

The scraper is using **template queries** that don't exist in HEB's GraphQL API:
- `searchProducts` - doesn't exist
- `getCategoryProducts` - doesn't exist

HEB uses different operation names that we need to discover from the browser.

## Solution: Discover Real Queries 🔍

HEB doesn't have a "get all products" endpoint. Instead, products are loaded through:

1. **Search queries** - when you type in the search bar
2. **Category/department browsing** - when you click category links
3. **Product listings** - when pages load with products

### Quick Discovery Steps:

#### Option 1: Find Search Query (Recommended First)
1. Open HEB.com in browser with DevTools Network tab open
2. **Type "milk" in the search bar** (don't submit, just type)
3. **Look for GraphQL requests** that appear (should trigger as you type)
4. **Click on the GraphQL request** (orange `{}` icon)
5. **Check Payload tab** - note:
   - `operationName` (e.g., "productSearch", "search", etc.)
   - `variables` (search term, storeId, etc.)
   - `query` structure (if visible)
   - `extensions.persistedQuery.sha256Hash` (if present)

#### Option 2: Find Category Browse Query
1. **Click on a category** (e.g., "Produce", "Meat & Seafood")
2. **Watch Network tab** as products load
3. **Find the GraphQL request** that loads the product list
4. **Capture the same details** as above

#### Option 3: Use Existing Shopping List
You already have `getShoppingListV2` which returns products! If you have products in a shopping list:
1. Query that list to get product IDs
2. Use those IDs to discover more queries (product details, etc.)

## Once You Have the Query:

### Step 1: Test the Query
Use the test script:

```bash
# Edit test_heb_query.py and add your discovered query
python3 test_heb_query.py --type search
```

### Step 2: Update the Scraper
Once the query works, update `heb_product_scraper.py`:

1. Replace `search_products()` method with real query
2. Replace `get_category_products()` method with real query
3. Test with store ID 202:

```bash
python3 heb_product_scraper.py --store-id 202 --strategy search --dry-run
```

### Step 3: Run Full Scrape
Once queries work:

```bash
# With Supabase configured:
python3 heb_product_scraper.py --store-id 202 --strategy both --rate-limit 1.0

# Or dry-run to test:
python3 heb_product_scraper.py --store-id 202 --strategy both --dry-run
```

## Files Created:

1. **`HEB_PRODUCT_DISCOVERY_GUIDE.md`** - Detailed guide on discovering queries
2. **`test_heb_query.py`** - Script to test discovered queries before updating scraper

## Expected Query Structure:

Based on common e-commerce patterns, expect something like:

```graphql
# Search
query searchProducts($query: String!, $storeId: String, $page: Int) {
  searchProducts(...) {
    products { id, name, price, ... }
    pagination { hasMore, totalCount, ... }
  }
}

# OR Category
query browseCategory($categoryId: String!, $storeId: String) {
  browseCategory(...) {
    products { ... }
    pagination { ... }
  }
}
```

But the actual names and structure need to be discovered from the browser!

## Important Notes:

1. **HEB may use persisted queries** - You might only see a hash in `extensions.persistedQuery.sha256Hash`. In that case:
   - Try sending just the hash (with variables)
   - Or send hash + full query together

2. **Cookies are important** - Make sure `HEB_COOKIES` env var is set, or pass via `--cookies`

3. **Store ID matters** - Store 202 is being used, which is good for store-specific pricing/location data

## Quick Test Command:

```bash
# Test with discovered query (after updating test_heb_query.py):
python3 test_heb_query.py --type search

# Or test scraper in dry-run mode:
python3 heb_product_scraper.py --store-id 202 --strategy search --dry-run
```

---

**Bottom line**: The scraper infrastructure is ready! We just need the actual GraphQL query names and structures from the browser to make it work.

