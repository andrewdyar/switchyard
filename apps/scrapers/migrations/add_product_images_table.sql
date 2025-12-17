-- Add product_images table for storing multiple images per product
-- Images are only stored on first scrape and never overwritten

-- Create product_images table
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL, -- 1 = primary, 2-10 = alternates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, image_url) -- Prevent duplicate images for same product
);

-- Create indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_order ON product_images(product_id, image_order);

-- Add comment
COMMENT ON TABLE product_images IS 'Product images (up to 10 per product). Images are only stored on first scrape when UPC is encountered and are never overwritten.';

-- Keep image_url in products table for backward compatibility (primary image)
-- This field can be populated from product_images where image_order = 1
-- But we maintain it for quick access without joins

COMMENT ON COLUMN products.image_url IS 'Primary product image URL. For multiple images, see product_images table.';



