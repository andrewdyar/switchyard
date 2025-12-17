# Proposed Changes for HEB Product Scraper - Data Capture Enhancement

## Answers to Your Questions

### 1. **Brand Information Logic**
**Your assumption is CORRECT:**
- If `brand.name` exists → use it
- If `brand.name` is null/empty BUT `brand.isOwnBrand = true` → use "HEB"
- If `brand.name` is null/empty AND `brand.isOwnBrand = false` → use NULL or "Unknown"

### 2. **Field Information Requests**

#### `bestAvailable`, `onAd`, `isNew`, etc.
From the API structure:
- **`bestAvailable`**: Boolean - indicates if this is the "best" variant when multiple sizes/flavors exist
- **`onAd`**: Boolean - product is currently featured in advertisements/promotions
- **`isNew`**: Boolean - new product flag (recently added to catalog)
- **`pricedByWeight`**: Boolean - product sold by weight (like produce, deli items)
- **`showCouponFlag`**: Boolean - has available digital coupons
- **`inAssortment`**: Boolean - product is in the store's current assortment (vs discontinued)

#### `availability.schedule` and `unavailabilityReasons`
- **`availability.schedule`**: Time-based availability (e.g., "Available Mon-Fri 8am-8pm") - currently NULL in sample
- **`unavailabilityReasons`**: Array of strings explaining why unavailable (e.g., ["OUT_OF_STOCK", "SEASONAL"])

### 3. **Ratings Information**
**IMPORTANT FINDING**: The HEB API response does NOT include `rating` or `reviewCount` fields in the category/search endpoints. These fields appear to be available only on individual product detail pages, which we're not currently scraping.

**Recommendation**: We can add a separate endpoint to fetch product details for ratings, OR we can note this as a future enhancement.

### 4. **`product_pricing.location_id` Clarification**
Looking at the migration file, `location_id` in `product_pricing` is described as "Optional location identifier for more granular pricing control" - it's currently TEXT and not a foreign key.

**Recommendation**: 
- Use `location_id` to store the HEB **store ID** (e.g., "202") for store-specific pricing
- The `store_name` column already exists and should be "heb" for all HEB products
- So: `store_name = "heb"`, `location_id = "202"` (the specific HEB store ID)

### 5. **Product Location Storage**
Currently, `productLocation.location` contains text like "In Dairy on the Back Wall". This is store-specific aisle/section information.

**Recommendation**: Store this in `product_store_mappings` as a new column `store_location_text` since it's specific to each store mapping.

---

## Proposed Database Schema Changes

### Migration: `add_heb_product_metadata.sql`

```sql
-- 1. Add raw_data JSONB column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS raw_data JSONB;

CREATE INDEX IF NOT EXISTS idx_products_raw_data ON products USING GIN (raw_data);

COMMENT ON COLUMN products.raw_data IS 'Full raw API response data from scraper (JSONB for querying)';

-- 2. Add brand column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

COMMENT ON COLUMN products.brand IS 'Product brand name (e.g., "H-E-B", "Great Value")';

-- 3. Add product metadata columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_page_url TEXT,
ADD COLUMN IF NOT EXISTS full_category_hierarchy TEXT,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS on_ad BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS best_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priced_by_weight BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_coupon_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS in_assortment BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new) WHERE is_new = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_on_ad ON products(on_ad) WHERE on_ad = TRUE;

COMMENT ON COLUMN products.product_page_url IS 'URL path to product detail page on HEB website';
COMMENT ON COLUMN products.full_category_hierarchy IS 'Full category path (e.g., "Dairy & eggs/Milk")';
COMMENT ON COLUMN products.is_new IS 'New product flag';
COMMENT ON COLUMN products.on_ad IS 'Product currently on advertisement';
COMMENT ON COLUMN products.best_available IS 'Best variant flag when multiple options exist';
COMMENT ON COLUMN products.priced_by_weight IS 'Product sold by weight';
COMMENT ON COLUMN products.show_coupon_flag IS 'Has available coupons';
COMMENT ON COLUMN products.in_assortment IS 'Product in store assortment';

-- 4. Add store-specific location and availability to product_store_mappings
ALTER TABLE product_store_mappings
ADD COLUMN IF NOT EXISTS store_location_text TEXT,
ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS availability_schedule JSONB,
ADD COLUMN IF NOT EXISTS unavailability_reasons TEXT[],
ADD COLUMN IF NOT EXISTS product_availability TEXT[], -- ["IN_STORE", "CURBSIDE_PICKUP", etc.]
ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER,
ADD COLUMN IF NOT EXISTS maximum_order_quantity INTEGER;

CREATE INDEX IF NOT EXISTS idx_store_mappings_stock_status ON product_store_mappings(stock_status);
CREATE INDEX IF NOT EXISTS idx_store_mappings_location ON product_store_mappings(store_location_text);

COMMENT ON COLUMN product_store_mappings.store_location_text IS 'Store-specific location (e.g., "In Dairy on the Back Wall")';
COMMENT ON COLUMN product_store_mappings.stock_status IS 'Stock status: IN_STOCK, OUT_OF_STOCK, LIMITED, etc.';
COMMENT ON COLUMN product_store_mappings.availability_schedule IS 'Time-based availability schedule (JSONB)';
COMMENT ON COLUMN product_store_mappings.unavailability_reasons IS 'Array of reasons why unavailable';
COMMENT ON COLUMN product_store_mappings.product_availability IS 'Available purchase methods: IN_STORE, CURBSIDE_PICKUP, etc.';

-- 5. Enhance product_pricing table for list/sale prices
ALTER TABLE product_pricing
ADD COLUMN IF NOT EXISTS list_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_price_cut BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_type TEXT, -- 'EACH', 'WEIGHT', etc.
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,4), -- Price per unit (oz, lb, etc.)
ADD COLUMN IF NOT EXISTS unit_price_unit TEXT; -- 'oz', 'lb', 'each', etc.

-- Update existing price column logic:
-- If sale_price exists, use it; otherwise use list_price
-- The existing 'price' column will store the effective price (sale_price if on sale, else list_price)

CREATE INDEX IF NOT EXISTS idx_pricing_on_sale ON product_pricing(is_on_sale) WHERE is_on_sale = TRUE;
CREATE INDEX IF NOT EXISTS idx_pricing_store_location ON product_pricing(store_name, location_id);

COMMENT ON COLUMN product_pricing.list_price IS 'Regular/list price';
COMMENT ON COLUMN product_pricing.sale_price IS 'Sale price (if on sale)';
COMMENT ON COLUMN product_pricing.is_on_sale IS 'Product currently on sale';
COMMENT ON COLUMN product_pricing.is_price_cut IS 'Price has been cut';
COMMENT ON COLUMN product_pricing.price_type IS 'Price type: EACH, WEIGHT, etc.';
COMMENT ON COLUMN product_pricing.unit_price IS 'Price per unit (for unit_price_unit)';
COMMENT ON COLUMN product_pricing.unit_price_unit IS 'Unit for unit_price (oz, lb, each, etc.)';
COMMENT ON COLUMN product_pricing.location_id IS 'HEB store ID (e.g., "202") for store-specific pricing';

-- 6. Add analytics properties table for velocity analysis
CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    is_cross_sell BOOLEAN DEFAULT FALSE,
    is_everyday_low_price BOOLEAN DEFAULT FALSE,
    is_limited_time_offer BOOLEAN DEFAULT FALSE,
    is_own_brand_upsell BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, store_name)
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_store ON product_analytics(store_name);
CREATE INDEX IF NOT EXISTS idx_product_analytics_edlp ON product_analytics(is_everyday_low_price) WHERE is_everyday_low_price = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_analytics_lto ON product_analytics(is_limited_time_offer) WHERE is_limited_time_offer = TRUE;

COMMENT ON TABLE product_analytics IS 'Product analytics properties for velocity analysis and sales strategy';
COMMENT ON COLUMN product_analytics.is_cross_sell IS 'Product used in cross-sell recommendations';
COMMENT ON COLUMN product_analytics.is_everyday_low_price IS 'EDLP pricing strategy';
COMMENT ON COLUMN product_analytics.is_limited_time_offer IS 'LTO promotion';
COMMENT ON COLUMN product_analytics.is_own_brand_upsell IS 'HEB brand upsell opportunity';

-- 7. Add category path to categories table (if not exists)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS category_path TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(category_path);

COMMENT ON COLUMN categories.category_path IS 'Full category hierarchy path';
```

---

## Proposed Scraper Changes

### Fields to Extract and Store:

1. **Products Table:**
   - `raw_data` (JSONB) - Full API response
   - `brand` - From `brand.name` or "HEB" if `isOwnBrand=true`
   - `product_page_url` - From `productPageURL`
   - `full_category_hierarchy` - From `fullCategoryHierarchy`
   - `is_new` - From `isNew`
   - `on_ad` - From `onAd`
   - `best_available` - From `bestAvailable`
   - `priced_by_weight` - From `pricedByWeight`
   - `show_coupon_flag` - From `showCouponFlag`
   - `in_assortment` - From `inAssortment`

2. **Product Store Mappings:**
   - `store_location_text` - From `productLocation.location`
   - `stock_status` - From `inventory.inventoryState` (normalized: "in_stock", "out_of_stock", etc.)
   - `availability_schedule` - From `availability.schedule` (JSONB)
   - `unavailability_reasons` - From `availability.unavailabilityReasons` (array)
   - `product_availability` - From SKU `productAvailability` array
   - `minimum_order_quantity` - From `minimumOrderQuantity`
   - `maximum_order_quantity` - From `maximumOrderQuantity`

3. **Product Pricing:**
   - `list_price` - From `contextPrices[].listPrice.amount` (ONLINE context)
   - `sale_price` - From `contextPrices[].salePrice.amount` (ONLINE context)
   - `is_on_sale` - From `contextPrices[].isOnSale` (ONLINE context)
   - `is_price_cut` - From `contextPrices[].isPriceCut` (ONLINE context)
   - `price_type` - From `contextPrices[].priceType` (ONLINE context)
   - `unit_price` - From `contextPrices[].unitSalePrice.amount` (ONLINE context)
   - `unit_price_unit` - From `contextPrices[].unitSalePrice.unit` (ONLINE context)
   - `store_name` - "heb"
   - `location_id` - HEB store ID (e.g., "202")
   - `price` - Effective price (sale_price if on sale, else list_price)

4. **Product Analytics:**
   - `is_cross_sell` - From `analyticsProductProperties.isCrossSell`
   - `is_everyday_low_price` - From `analyticsProductProperties.isEveryDayLowPrice`
   - `is_limited_time_offer` - From `analyticsProductProperties.isLimitedTimeOffer`
   - `is_own_brand_upsell` - From `analyticsProductProperties.isOwnBrandUpsell`

5. **Categories:**
   - `category_path` - From `fullCategoryHierarchy` (store in categories table)

---

## Notes & Recommendations

### Ratings
**Ratings are NOT in the category API response.** To get ratings, we would need to:
- Scrape individual product detail pages (`productPageURL`)
- OR use a separate API endpoint (if available)
- **Recommendation**: Add as Phase 2 enhancement

### Pricing Strategy
- Store both `list_price` and `sale_price` for sale detection
- Use `is_on_sale` flag for quick filtering
- Store `unit_price` for price comparison across sizes
- Use `location_id` for store-specific pricing (different HEB stores may have different prices)

### Velocity Analysis
The analytics properties will help identify:
- **EDLP products** - Stable pricing, good for warehouse stocking
- **LTO products** - Limited time, high velocity during promotion
- **Cross-sell products** - Frequently bought together
- **Own brand upsell** - HEB brand alternatives

### Stock Status Normalization
Map HEB's `inventoryState` values:
- "IN_STOCK" → "in_stock"
- "OUT_OF_STOCK" → "out_of_stock"
- "LIMITED" → "limited"
- Others → store as-is (lowercase)

---

## Questions for You

1. **Ratings**: Should we add a Phase 2 task to scrape product detail pages for ratings, or skip for now?

2. **Pricing Context**: Should we store pricing for multiple contexts (ONLINE, CURBSIDE) or just ONLINE?

3. **Raw Data Size**: JSONB can be large. Should we store full raw_data or a filtered subset?

4. **Category Path**: Should `fullCategoryHierarchy` be stored in both `products.full_category_hierarchy` AND `categories.category_path`, or just one?

5. **Multiple SKUs**: Currently we only store the first SKU. Should we store all SKUs or just the primary one?

