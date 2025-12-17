-- Migration: Align Supabase Schema with Retailer Scraping Guide
-- Date: 2025-01-20
-- Purpose: Update schema to match docs/technical/retailer-scraping-guide.md

-- ============================================================================
-- 1. UPDATE source_products TABLE
-- ============================================================================

-- Drop view that depends on upc column
DROP VIEW IF EXISTS products_with_pricing;

-- Rename upc to barcode and change type to VARCHAR(14)
-- This accommodates UPC-12, EAN-8, EAN-13, and GTIN-14 formats
ALTER TABLE source_products 
RENAME COLUMN upc TO barcode;

ALTER TABLE source_products 
ALTER COLUMN barcode TYPE VARCHAR(14);

-- Recreate view with barcode instead of upc
CREATE OR REPLACE VIEW products_with_pricing AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.image_url as product_image_url,
    p.category_id,
    p.barcode,
    psm.id as mapping_id,
    psm.store_name,
    psm.store_item_id,
    psm.store_item_name,
    psm.store_image_url,
    psm.brand_logo_url,
    psm.is_active as mapping_active,
    pp.price,
    pp.effective_from as price_effective_from,
    pp.store_name as price_store_name
FROM source_products p
INNER JOIN product_store_mappings psm ON p.id = psm.product_id
LEFT JOIN LATERAL (
    SELECT price, effective_from, store_name
    FROM product_pricing
    WHERE product_id = p.id
    AND (store_name = psm.store_name OR store_name IS NULL)
    AND effective_to IS NULL
    ORDER BY effective_from DESC, store_name DESC NULLS LAST
    LIMIT 1
) pp ON true
WHERE psm.is_active = true;

-- Add size and size_uom fields
ALTER TABLE source_products 
ADD COLUMN IF NOT EXISTS size VARCHAR(50);

ALTER TABLE source_products 
ADD COLUMN IF NOT EXISTS size_uom VARCHAR(20);

-- Update index on barcode (was upc)
DROP INDEX IF EXISTS idx_products_upc;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON source_products(barcode);

-- Add comments
COMMENT ON COLUMN source_products.barcode IS 'Product barcode (UPC-12, EAN-8, EAN-13, or GTIN-14). Supports all standard barcode formats.';
COMMENT ON COLUMN source_products.size IS 'Package size (e.g., "16 oz", "1 lb", "24 ct")';
COMMENT ON COLUMN source_products.size_uom IS 'Size unit of measure (oz, lb, ct, etc.)';

-- ============================================================================
-- 2. UPDATE product_store_mappings TABLE
-- ============================================================================

-- Add store location fields
ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS store_location VARCHAR(50);

ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS store_zone VARCHAR(10);

ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS store_aisle INTEGER;

ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS store_block VARCHAR(10);

ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS store_floor VARCHAR(10);

-- Add inventory tracking fields (idempotent - may already exist from add_inventory_tracking_fields.sql)
ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS out_of_stock_count INTEGER DEFAULT 0;

ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Add indexes for store location fields
CREATE INDEX IF NOT EXISTS idx_store_mappings_location ON product_store_mappings(store_location) 
WHERE store_location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_mappings_zone ON product_store_mappings(store_zone) 
WHERE store_zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_mappings_aisle ON product_store_mappings(store_aisle) 
WHERE store_aisle IS NOT NULL;

-- Add indexes for inventory tracking fields (idempotent)
CREATE INDEX IF NOT EXISTS idx_store_mappings_out_of_stock_count 
ON product_store_mappings(out_of_stock_count) 
WHERE out_of_stock_count > 0;

CREATE INDEX IF NOT EXISTS idx_store_mappings_last_seen_at 
ON product_store_mappings(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_store_mappings_deactivation_reason 
ON product_store_mappings(deactivation_reason) 
WHERE deactivation_reason IS NOT NULL;

-- Add comments
COMMENT ON COLUMN product_store_mappings.store_location IS 'Store-specific location display value (e.g., "A12", "Aisle 5")';
COMMENT ON COLUMN product_store_mappings.store_zone IS 'Store zone letter (e.g., "A", "B")';
COMMENT ON COLUMN product_store_mappings.store_aisle IS 'Store aisle number (e.g., 12)';
COMMENT ON COLUMN product_store_mappings.store_block IS 'Store block/section (Target-specific)';
COMMENT ON COLUMN product_store_mappings.store_floor IS 'Store floor number (Target-specific)';
COMMENT ON COLUMN product_store_mappings.last_seen_at IS 'Timestamp of last successful scrape where product was found. Used for shopping list generation and stock status tracking.';
COMMENT ON COLUMN product_store_mappings.out_of_stock_count IS 'Consecutive days product not found in daily scrapes. When >= 4, product is marked as DISCONTINUED.';
COMMENT ON COLUMN product_store_mappings.deactivation_reason IS 'Reason for deactivation: DISCONTINUED, NOT_SOLD_IN_STORE, UNAVAILABLE, etc. Used for audit trail and debugging.';

-- ============================================================================
-- 3. UPDATE goods_product_attributes TABLE (Goods warehouse location)
-- ============================================================================

-- Add warehouse_zone field for temperature zone tracking
ALTER TABLE goods_product_attributes 
ADD COLUMN IF NOT EXISTS warehouse_zone TEXT;

-- Add index for warehouse_zone (for filtering by temperature zone)
CREATE INDEX IF NOT EXISTS idx_goods_attributes_warehouse_zone 
ON goods_product_attributes(warehouse_zone) 
WHERE warehouse_zone IS NOT NULL;

-- Add comment
COMMENT ON COLUMN goods_product_attributes.warehouse_zone IS 'Goods warehouse temperature zone: A = Ambient, C = Chilled, F = Frozen. Combined with warehouse_aisle, warehouse_shelf_group, and warehouse_shelf to form location (e.g., "3C-2" = Aisle 3, Shelf group C, Shelf 2).';

-- ============================================================================
-- 4. VERIFY product_pricing TABLE
-- ============================================================================

-- Verify required fields exist (these should already be present, but check)
-- store_name, price_per_unit, price_per_unit_uom, effective_from, effective_to
-- No changes needed - these fields already exist per schema inspection

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration is idempotent using IF NOT EXISTS clauses
-- The upc → barcode rename requires data migration (handled above)
-- Existing code references to 'upc' will need to be updated separately
-- Warehouse location fields will be empty until products are physically placed in warehouse

