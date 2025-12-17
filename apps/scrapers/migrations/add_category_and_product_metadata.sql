-- Add description and is_active to categories table
-- Add is_active to products table
-- This allows us to capture more information from scrapers

-- Add description to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_active to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add is_active to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for active categories
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- Create index for active products
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;

