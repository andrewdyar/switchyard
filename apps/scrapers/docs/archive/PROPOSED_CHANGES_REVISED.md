# Revised Proposed Changes for HEB Product Scraper

## Answers to Your Questions

### 1. **Ratings**: ✅ Skipped - No ratings in detail pages

### 2. **Pricing Context**: Store ONLINE and CURBSIDE prices
- Store pricing records for both contexts
- Store `unit_list_price_unit` (oz, g, etc.) - the unit used for unit pricing
- We'll calculate unit prices ourselves when needed

### 3. **Raw Data Storage**: 
**Recommendation: Store it**
- Current: 0.31GB for 47k products = ~6.6KB per product
- Raw JSON is typically 5-10KB per product
- With compression, JSONB storage would add ~0.3-0.5GB
- **Value**: Full API response enables future field extraction without re-scraping, debugging, and data recovery
- **Recommendation**: Store it - we have 7.7GB remaining, and it's valuable for future needs

### 4. **Category Hierarchy**: 
**Understanding**: You want a unified Goods category system based on HEB's hierarchy
- HEB's hierarchy becomes the base for Goods categories
- Products link to the most nested category
- Can traverse up via `parent_id` to build full hierarchy
- Costco products will map to these same categories later

**Questions for you:**
- Should we create categories with `source='heb'` or `source='goods'` (since it's our unified system)?
- When parsing "Dairy & eggs/Milk", should we create:
  - Level 1: "Dairy & eggs" (parent_id = NULL)
  - Level 2: "Milk" (parent_id = "Dairy & eggs" UUID)
- Should `fullCategoryHierarchy` be stored in `products.full_category_hierarchy` for quick reference, or only in the category structure?

### 5. **Multiple SKUs**: 
**Value Examples:**
- **Different sizes**: "Milk 1 gal" vs "Milk 1/2 gal" - same product, different SKUs, different prices
- **Different flavors**: "Coca-Cola 12pk" vs "Diet Coke 12pk" - might be same product ID but different SKUs
- **Different packaging**: "Eggs 12ct" vs "Eggs 18ct" - same product, different SKUs

**Current limitation**: We only store the first SKU, so we might miss:
- Better prices on different sizes
- Availability differences per SKU
- Different unit prices for comparison

**Recommendation**: Store all SKUs in a separate `product_skus` table with:
- `product_id` (FK to products)
- `sku_id` (HEB SKU ID)
- `upc`, `size`, `price`, `availability`
- This allows us to show "Milk - 1 gal ($3.72)" and "Milk - 1/2 gal ($2.19)" as separate options

**Question**: Do you want to store all SKUs now, or keep it simple with just the primary SKU for now?

---

## Revised Database Schema Changes

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
COMMENT ON COLUMN product_store_mappings.stock_status IS 'Stock status: in_stock, out_of_stock, limited, etc.';
COMMENT ON COLUMN product_store_mappings.availability_schedule IS 'Time-based availability schedule (JSONB)';
COMMENT ON COLUMN product_store_mappings.unavailability_reasons IS 'Array of reasons why unavailable';
COMMENT ON COLUMN product_store_mappings.product_availability IS 'Available purchase methods: IN_STORE, CURBSIDE_PICKUP, etc.';

-- 5. Enhance product_pricing table for list/sale prices with multiple contexts
ALTER TABLE product_pricing
ADD COLUMN IF NOT EXISTS list_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_price_cut BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_type TEXT, -- 'EACH', 'WEIGHT', etc.
ADD COLUMN IF NOT EXISTS unit_list_price_unit TEXT, -- 'oz', 'g', 'lb', etc. - unit used for unit pricing
ADD COLUMN IF NOT EXISTS pricing_context TEXT; -- 'ONLINE', 'CURBSIDE'

-- Update existing price column logic:
-- The existing 'price' column will store the effective price (sale_price if on sale, else list_price)

CREATE INDEX IF NOT EXISTS idx_pricing_on_sale ON product_pricing(is_on_sale) WHERE is_on_sale = TRUE;
CREATE INDEX IF NOT EXISTS idx_pricing_store_location ON product_pricing(store_name, location_id);
CREATE INDEX IF NOT EXISTS idx_pricing_context ON product_pricing(pricing_context);

COMMENT ON COLUMN product_pricing.list_price IS 'Regular/list price';
COMMENT ON COLUMN product_pricing.sale_price IS 'Sale price (if on sale)';
COMMENT ON COLUMN product_pricing.is_on_sale IS 'Product currently on sale';
COMMENT ON COLUMN product_pricing.is_price_cut IS 'Price has been cut';
COMMENT ON COLUMN product_pricing.price_type IS 'Price type: EACH, WEIGHT, etc.';
COMMENT ON COLUMN product_pricing.unit_list_price_unit IS 'Unit for unit pricing (oz, g, lb, each, etc.)';
COMMENT ON COLUMN product_pricing.pricing_context IS 'Pricing context: ONLINE or CURBSIDE';
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

-- 7. Update categories table to support hierarchical paths
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS category_path TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(category_path);

COMMENT ON COLUMN categories.category_path IS 'Full category hierarchy path (e.g., "Dairy & eggs/Milk")';
```

---

## Revised Scraper Changes

### Fields to Extract and Store:

1. **Products Table:**
   - `raw_data` (JSONB) - Full API response ✅
   - `brand` - From `brand.name` or "HEB" if `isOwnBrand=true` and name is null/empty
   - `product_page_url` - From `productPageURL`
   - `full_category_hierarchy` - From `fullCategoryHierarchy` (for quick reference)
   - `is_new` - From `isNew`
   - `on_ad` - From `onAd`
   - `best_available` - From `bestAvailable`
   - `priced_by_weight` - From `pricedByWeight`
   - `show_coupon_flag` - From `showCouponFlag`
   - `in_assortment` - From `inAssortment`

2. **Categories Table (Hierarchical Structure):**
   - Parse `fullCategoryHierarchy` (e.g., "Dairy & eggs/Milk")
   - Create Level 1 category: "Dairy & eggs" (parent_id = NULL, level = 1)
   - Create Level 2 category: "Milk" (parent_id = "Dairy & eggs" UUID, level = 2)
   - Store `category_path` = "Dairy & eggs/Milk" in the most nested category
   - Link product to most nested category via `category_id` or `subcategory_id`

3. **Product Store Mappings:**
   - `store_location_text` - From `productLocation.location`
   - `stock_status` - From `inventory.inventoryState` (normalized to lowercase: "in_stock", "out_of_stock", etc.)
   - `availability_schedule` - From `availability.schedule` (JSONB, can be NULL)
   - `unavailability_reasons` - From `availability.unavailabilityReasons` (array)
   - `product_availability` - From SKU `productAvailability` array (e.g., ["IN_STORE", "CURBSIDE_PICKUP"])
   - `minimum_order_quantity` - From `minimumOrderQuantity`
   - `maximum_order_quantity` - From `maximumOrderQuantity`

4. **Product Pricing (ONLINE and CURBSIDE contexts):**
   For each context (ONLINE, CURBSIDE), create a pricing record:
   - `list_price` - From `contextPrices[].listPrice.amount`
   - `sale_price` - From `contextPrices[].salePrice.amount`
   - `is_on_sale` - From `contextPrices[].isOnSale`
   - `is_price_cut` - From `contextPrices[].isPriceCut`
   - `price_type` - From `contextPrices[].priceType` (e.g., "EACH")
   - `unit_list_price_unit` - From `contextPrices[].unitListPrice.unit` (e.g., "oz", "g")
   - `pricing_context` - "ONLINE" or "CURBSIDE"
   - `store_name` - "heb"
   - `location_id` - HEB store ID (e.g., "202")
   - `price` - Effective price (sale_price if on sale, else list_price)

5. **Product Analytics:**
   - `is_cross_sell` - From `analyticsProductProperties.isCrossSell`
   - `is_everyday_low_price` - From `analyticsProductProperties.isEveryDayLowPrice`
   - `is_limited_time_offer` - From `analyticsProductProperties.isLimitedTimeOffer`
   - `is_own_brand_upsell` - From `analyticsProductProperties.isOwnBrandUpsell`

---

## Questions for You

### Category Structure:
1. **Category Source**: Should categories created from HEB hierarchy have `source='heb'` or `source='goods'`? (Since it's becoming your unified system, I'd suggest `source='goods'`)

2. **Category Path Storage**: Should we store `fullCategoryHierarchy` in:
   - Only `categories.category_path` (on the most nested category)?
   - Or also in `products.full_category_hierarchy` for quick reference without joins?

3. **Category Linking**: For a product with hierarchy "Dairy & eggs/Milk":
   - Link to `category_id` = "Dairy & eggs" (parent) AND `subcategory_id` = "Milk" (child)?
   - Or only `subcategory_id` = "Milk" (most nested), and traverse up via parent_id when needed?

### Multiple SKUs:
4. **SKU Storage**: Should we:
   - **Option A**: Store only primary SKU (keep it simple for now)
   - **Option B**: Create `product_skus` table to store all SKUs with their own pricing/availability
   - **Option C**: Store all SKU data in `raw_data` JSONB and extract primary SKU to main fields

**My recommendation**: Option A for now (keep it simple), but structure the code so we can easily add Option B later if needed.

---

## Implementation Notes

### Stock Status Normalization:
Map HEB's `inventoryState` to lowercase:
- "IN_STOCK" → "in_stock"
- "OUT_OF_STOCK" → "out_of_stock"  
- "LIMITED" → "limited"
- Others → lowercase as-is

### Pricing Records:
- Create **two pricing records** per product: one for ONLINE context, one for CURBSIDE
- Both linked to same `product_id` and `location_id` (store ID)
- Use `pricing_context` to distinguish
- The `price` column stores effective price (sale_price if on sale, else list_price)

### Category Hierarchy Parsing:
- Parse `fullCategoryHierarchy` by "/" delimiter
- Create parent categories first (if they don't exist)
- Create child categories with proper `parent_id` references
- Store full path in `category_path` on the most nested category
- Link product to most nested category

---

Please answer the 4 questions above, and I'll finalize the implementation plan!

