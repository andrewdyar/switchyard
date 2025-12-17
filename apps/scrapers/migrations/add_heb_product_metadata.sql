-- Migration: Add HEB product metadata and enhanced data capture
-- Date: 2025-11-22
-- Purpose: Store comprehensive product data from HEB API including raw_data, pricing contexts, SKUs, and analytics

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

-- 6. Create product_skus table for storing all SKUs per product
CREATE TABLE IF NOT EXISTS product_skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL, -- 'heb', 'walmart', 'costco', etc.
    sku_id TEXT NOT NULL, -- Store's SKU ID
    upc TEXT,
    customer_friendly_size TEXT, -- e.g., "1 gal", "16 oz"
    is_primary BOOLEAN DEFAULT FALSE, -- Primary SKU for this product
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, store_name, sku_id)
);

CREATE INDEX IF NOT EXISTS idx_product_skus_product ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_store ON product_skus(store_name);
CREATE INDEX IF NOT EXISTS idx_product_skus_primary ON product_skus(product_id, store_name, is_primary) WHERE is_primary = TRUE;

COMMENT ON TABLE product_skus IS 'All SKUs for a product (different sizes, flavors, etc.)';
COMMENT ON COLUMN product_skus.is_primary IS 'Primary SKU used for main product display';

-- 7. Add analytics properties table for velocity analysis
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

-- 8. Update categories table to support hierarchical paths
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS category_path TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(category_path);

COMMENT ON COLUMN categories.category_path IS 'Full category hierarchy path (e.g., "Dairy & eggs/Milk")';

-- 9. Add trigger for product_skus updated_at
CREATE TRIGGER update_product_skus_updated_at BEFORE UPDATE ON product_skus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Add trigger for product_analytics updated_at
CREATE TRIGGER update_product_analytics_updated_at BEFORE UPDATE ON product_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

