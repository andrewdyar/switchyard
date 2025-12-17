-- Migration: Add location-based pricing and brand logos
-- Date: 2025-11-22

-- 1. Add location support to product_pricing table
-- Add store_name column for location-specific pricing
ALTER TABLE product_pricing 
ADD COLUMN IF NOT EXISTS store_name TEXT;

-- Add location_id for more granular location control (optional, for future use)
ALTER TABLE product_pricing 
ADD COLUMN IF NOT EXISTS location_id TEXT;

-- Update index to include store_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_pricing_product_store 
ON product_pricing(product_id, store_name, effective_to) 
WHERE effective_to IS NULL;

-- Add comment
COMMENT ON COLUMN product_pricing.store_name IS 'Store name for location-specific pricing (e.g., costco-681-wh, heb-202)';
COMMENT ON COLUMN product_pricing.location_id IS 'Optional location identifier for more granular pricing control';

-- 2. Add brand_logo_url to product_store_mappings
ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- Add comment
COMMENT ON COLUMN product_store_mappings.brand_logo_url IS 'URL to the brand logo image (e.g., Costco logo)';

-- 3. Create a view for optimized product loading
CREATE OR REPLACE VIEW products_with_pricing AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.image_url as product_image_url,
    p.category_id,
    p.upc,
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
FROM products p
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

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_mappings_active_store 
ON product_store_mappings(is_active, store_name) 
WHERE is_active = true;

