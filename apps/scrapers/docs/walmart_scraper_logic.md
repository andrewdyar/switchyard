# Walmart Scraper Product Storage Logic

## Overview

The Walmart scraper now implements intelligent product storage that:
1. Checks for existing products before creating new ones
2. Fetches UPCs from PDPs only when needed (new products)
3. Matches products by UPC across retailers (like Central Market)
4. Correctly handles pricing and availability updates

## Storage Flow

### Step 1: Check Existing Mapping
- Lookup `product_store_mappings` by:
  - `store_name = 'walmart'`
  - `store_item_id = external_id` (Walmart's usItemId)
- If found:
  - We already have this product mapped
  - Get `product_id` from mapping
  - Get UPC from related product if available
  - Skip UPC fetch (saves PDP requests)

### Step 2: Fetch UPC (Only if Needed)
- **If mapping not found AND no UPC in product data:**
  - Call `fetch_pdp_and_extract_upc(us_item_id)`
  - Navigate to PDP: `https://www.walmart.com/ip/{us_item_id}`
  - Extract `__NEXT_DATA__` from page
  - Recursively search for product object with `upc` field
  - Return UPC if found
- **If UPC already exists** (from previous scrape or PDP):
  - Use existing UPC
  - Skip PDP fetch

### Step 3: Lookup Product by UPC
- **If UPC exists and is valid (≥6 digits):**
  - Query `products` table: `WHERE upc = {upc} LIMIT 1`
  - If found:
    - Use existing `product_id`
    - This allows matching products across retailers (e.g., same product at Walmart and HEB)
  - If not found:
    - Will create new product in Step 4

### Step 4: Create or Update Product
- **If product_id exists** (from Step 1 or Step 3):
  - Update existing product:
    - Update name, image_url, brand
    - Add/update UPC if not present
    - Add category/subcategory if missing
    - Update `updated_at` timestamp
- **If product_id does not exist:**
  - Create new product:
    - Generate new UUID
    - Set all product fields (name, brand, UPC, category, etc.)
    - Set `is_active = True`
    - Set `created_at` and `updated_at` timestamps

### Step 5: Upsert Store Mapping
- Always upsert `product_store_mappings` record:
  - `product_id`: From Step 4
  - `store_name`: 'walmart'
  - `store_item_id`: external_id (usItemId)
  - `store_item_name`: Product name
  - `store_image_url`: Product image
  - `is_active`: From `availability_status` (True if in stock)
  - `store_location`: Aisle display value (e.g., "A12")
  - `store_zone`: Zone letter (e.g., "A")
  - `store_aisle`: Aisle number (e.g., 12)
- Uses `on_conflict = 'product_id,store_name,store_item_id'` to update existing mappings

### Step 6: Insert Pricing Record
- Always insert new `product_pricing` record (for price history):
  - `product_id`: From Step 4
  - `store_name`: 'walmart'
  - `location_id`: Store ID (e.g., '4554')
  - `price`: Current price (cost_price)
  - `list_price`: Regular price (wasPrice)
  - `price_per_unit`: Price per unit
  - `price_per_unit_uom`: Unit of measure
  - `is_on_sale`: Calculated from list_price > price
  - `effective_from`: Current timestamp
- **Note**: We always insert (never update) to maintain price history

## Key Features

### UPC Matching Across Retailers
- Products with same UPC are matched across retailers
- Example: Same cereal at Walmart and HEB → same `product_id`
- Each retailer maintains separate `product_store_mappings` entry

### Variant Handling
- Walmart products with variants have different `store_item_id`s
- Each variant gets its own `product_store_mapping` entry
- All variants link to same `product_id` if they share UPC
- If variants have different UPCs, they become separate products

### Efficient UPC Fetching
- Only fetches UPC from PDP when:
  - Product is new (no existing mapping)
  - UPC is not already known
- Existing products skip PDP fetch entirely
- Saves significant API requests for daily scrapes

### Availability Tracking
- `is_active` in `product_store_mappings` reflects current stock status
- Derived from `availabilityStatusV2.value`:
  - `IN_STOCK` → `is_active = True`
  - `OUT_OF_STOCK` → `is_active = False`
  - `LIMITED_STOCK` → `is_active = True`

### Store Location
- Extracts from `productLocation` array:
  - `displayValue`: "A12" (human-readable)
  - `zone`: "A" (zone letter)
  - `aisle`: 12 (aisle number)
- Only available when store is selected and product is stocked

## Example Scenarios

### Scenario 1: New Product (No Existing Mapping, No UPC)
1. Extract product data from category page
2. Check mapping → Not found
3. Fetch UPC from PDP → "012345678901"
4. Lookup by UPC → Not found
5. Create new product with UPC
6. Create store mapping
7. Insert pricing record

### Scenario 2: Existing Product (Has Mapping)
1. Extract product data from category page
2. Check mapping → Found (product_id = "abc-123")
3. Skip UPC fetch (already have product_id)
4. Update product if needed
5. Update store mapping (availability, location)
6. Insert new pricing record

### Scenario 3: Product Exists at Another Retailer (UPC Match)
1. Extract product data from category page
2. Check mapping → Not found
3. Fetch UPC from PDP → "012345678901"
4. Lookup by UPC → Found (product_id = "abc-123" from HEB)
5. Use existing product_id (merge with HEB product)
6. Create new store mapping for Walmart
7. Insert pricing record for Walmart

### Scenario 4: Daily Update (Product Already Mapped)
1. Extract product data from category page
2. Check mapping → Found (product_id = "abc-123")
3. Skip UPC fetch
4. Update product if needed
5. Update store mapping (new availability, location if changed)
6. Insert new pricing record (price history)

## Database Schema Usage

### `products` Table
- One row per unique UPC
- Matched across all retailers
- Fields: id, name, brand, upc, category_id, subcategory_id, image_url

### `product_store_mappings` Table
- One row per retailer per product variant
- Fields: product_id, store_name, store_item_id, is_active, store_location, store_zone, store_aisle
- Unique constraint: (product_id, store_name, store_item_id)

### `product_pricing` Table
- One row per price change (price history)
- Fields: product_id, store_name, location_id, price, list_price, effective_from
- Always insert (never update) to maintain history

## Error Handling

- **UPC fetch fails**: Product still created (UPC can be added later)
- **Category lookup fails**: Product created with uncategorized
- **Pricing insert fails**: Logged but doesn't fail product creation
- **Mapping upsert fails**: Logged and returns False

## Performance Optimizations

1. **Skip PDP fetch for existing products**: Saves ~2 seconds per existing product
2. **Batch category lookups**: Category IDs cached in memory
3. **Single database transaction**: All updates in one call where possible
4. **UPC validation**: Only lookup UPCs that are ≥6 digits

## Future Enhancements

- [ ] Batch UPC fetches (fetch multiple PDPs in parallel)
- [ ] Cache UPC lookups in memory during scrape
- [ ] Retry logic for failed UPC fetches
- [ ] Variant grouping (group variants by base product)



