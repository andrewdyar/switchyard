# HEB Add Items to Shopping List - Implementation Guide

## Overview

This guide helps you add product IDs to an HEB shopping list using the GraphQL API. HEB automatically optimizes the shopping order when you set "Sort by: Most efficient route" in the UI, so we don't need to build our own optimizer.

## Which ID to Use?

Based on the GraphQL response you provided, there are two types of IDs:

1. **`product.id`** - The product identifier (e.g., `"325173"` for celery)
2. **`product.SKUs[].id`** - The SKU identifier (e.g., `"4577"` for celery)

**Answer: Use `product.id`** (not SKU.id)

The mutation `addShoppingListItemsV2` expects product IDs. You can see this in the response structure where each item has:
- `product.id: "325173"` (this is what you should use)
- `product.SKUs[].id: "4577"` (this is the SKU variant, not needed for adding)

## Discovering the Exact Mutation Structure

To find the exact input format for `addShoppingListItemsV2`, you need to:

1. **Open Browser DevTools** (F12 or Cmd+Option+I)
2. **Go to Network tab**
3. **Filter by "graphql" or "graphql"**
4. **Add an item to your list** (click "Add an item" → search → add to list)
5. **Find the `addShoppingListItemsV2` request**
6. **Click on it and view the "Payload" or "Request" tab**

Look for the structure of the `items` array. It might be:
```json
{
  "listId": "34b9c366-1453-44db-b129-b5e0d66a5c37",
  "items": [
    {
      "productId": "325173",
      "quantity": 1
    }
  ]
}
```

Or it might be:
```json
{
  "listId": "34b9c366-1453-44db-b129-b5e0d66a5c37",
  "items": [
    {
      "id": "325173",
      "quantity": 1
    }
  ]
}
```

Once you find the exact structure, update `heb_graphql_client.py` in the `add_shopping_list_items_v2` method.

## Capturing Cookies for Authentication

HEB requires authentication via cookies. Here's how to capture them:

### Method 1: Browser DevTools (Recommended)

1. **Open your HEB shopping list** in the browser (while logged in)
2. **Open DevTools** (F12 or Cmd+Option+I)
3. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
4. **Click on "Cookies"** → `https://www.heb.com`
5. **Copy the cookie values** - you'll need cookies like:
   - `JSESSIONID`
   - `_ga` (Google Analytics)
   - Any authentication tokens

### Method 2: Network Tab

1. **Open DevTools** → **Network tab**
2. **Add an item to your list** (or refresh the page)
3. **Find any request to `heb.com`**
4. **Click on it** → **Headers tab**
5. **Scroll to "Request Headers"**
6. **Copy the entire `Cookie:` header value**

### Method 3: Browser Extension

You can use a browser extension like "Cookie Editor" to export all cookies for `heb.com`.

### Using Cookies in the Script

Once you have the cookies, you can:

**Option A: Pass as command-line argument**
```bash
python heb_sku_importer.py \
  --list-id 34b9c366-1453-44db-b129-b5e0d66a5c37 \
  --product-ids product_ids.txt \
  --cookies "JSESSIONID=abc123; _ga=GA1.2.xyz; ..."
```

**Option B: Set environment variable**
```bash
export HEB_COOKIES="JSESSIONID=abc123; _ga=GA1.2.xyz; ..."
python heb_sku_importer.py --list-id <id> --product-ids <file>
```

**Option C: Store in a file** (not recommended for security, but useful for testing)
```bash
# Create .env file (add to .gitignore!)
echo 'HEB_COOKIES="JSESSIONID=abc123; ..."' > .env
```

## Usage Examples

### Example 1: Add Single Product ID

```bash
python heb_add_items.py \
  34b9c366-1453-44db-b129-b5e0d66a5c37 \
  325173 \
  --cookies "your_cookies_here"
```

### Example 2: Add Multiple Product IDs from File

Create `product_ids.txt`:
```
325173
1803322
5569554
```

Then run:
```bash
python heb_sku_importer.py \
  --list-id 34b9c366-1453-44db-b129-b5e0d66a5c37 \
  --product-ids product_ids.txt \
  --cookies "your_cookies_here"
```

### Example 3: Add from CSV

Create `products.csv`:
```csv
product_id,quantity
325173,1
1803322,2
5569554,1
```

Then run:
```bash
python heb_sku_importer.py \
  --list-id 34b9c366-1453-44db-b129-b5e0d66a5c37 \
  --product-ids products.csv \
  --cookies "your_cookies_here"
```

## Next Steps

1. **Discover the exact mutation structure** using DevTools
2. **Update `heb_graphql_client.py`** with the correct input format
3. **Test with a single product ID** to verify it works
4. **Scale up** to add multiple items

## Troubleshooting

### Error: "Unauthorized" or "Authentication required"
- **Solution**: Make sure cookies are correctly formatted and include all required authentication cookies

### Error: "Invalid product ID"
- **Solution**: Verify you're using `product.id` (e.g., "325173"), not `SKU.id` (e.g., "4577")

### Error: "Mutation not found" or GraphQL errors
- **Solution**: Check the exact mutation name and structure in DevTools. The mutation might be named differently or require different parameters.

### Items added but not in correct order
- **Solution**: This is expected! HEB sorts items automatically. In the UI, set "Sort by: Most efficient route" to see the optimized order.

## Files

- `heb_graphql_client.py` - GraphQL client with `add_shopping_list_items_v2` method
- `heb_add_items.py` - Simple CLI tool for adding items
- `heb_sku_importer.py` - Full-featured importer with file support

