-- Add inventory tracking fields to product_store_mappings table
-- These fields support daily stock status tracking and out-of-stock detection

-- Add out_of_stock_count: tracks consecutive days product not found
ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS out_of_stock_count INTEGER DEFAULT 0;

-- Add last_seen_at: timestamp of last successful scrape
ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Add deactivation_reason: reason for deactivation (for audit trail)
ALTER TABLE product_store_mappings 
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Add index on out_of_stock_count for efficient queries
CREATE INDEX IF NOT EXISTS idx_store_mappings_out_of_stock_count 
ON product_store_mappings(out_of_stock_count) 
WHERE out_of_stock_count > 0;

-- Add index on last_seen_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_store_mappings_last_seen_at 
ON product_store_mappings(last_seen_at);

-- Add index on deactivation_reason for filtering
CREATE INDEX IF NOT EXISTS idx_store_mappings_deactivation_reason 
ON product_store_mappings(deactivation_reason) 
WHERE deactivation_reason IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN product_store_mappings.out_of_stock_count IS 'Consecutive days product not found in daily scrapes. When >= 4, product is marked as DISCONTINUED.';
COMMENT ON COLUMN product_store_mappings.last_seen_at IS 'Timestamp of last successful scrape where product was found. Used for shopping list generation and stock status tracking.';
COMMENT ON COLUMN product_store_mappings.deactivation_reason IS 'Reason for deactivation: DISCONTINUED, NOT_SOLD_IN_STORE, UNAVAILABLE, etc. Used for audit trail and debugging.';

