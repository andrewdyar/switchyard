# Database Schema

## Core Tables

```sql
-- Products: One row per unique UPC
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(14) UNIQUE,  -- UPC-12, EAN-8, EAN-13, GTIN-14
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    category_id UUID REFERENCES categories(id),
    size VARCHAR(50),
    size_uom VARCHAR(20),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retailer-specific product data
CREATE TABLE retailer_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    retailer VARCHAR(50) NOT NULL,  -- heb, walmart, target, etc.
    external_id VARCHAR(100) NOT NULL,  -- retailer's product ID
    cost_price DECIMAL(10,2),
    list_price DECIMAL(10,2),
    price_per_unit DECIMAL(10,4),
    price_per_unit_uom VARCHAR(20),
    last_scraped_at TIMESTAMPTZ,
    UNIQUE(retailer, external_id)
);

-- Store-specific data (pricing, location, availability)
CREATE TABLE store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_product_id UUID REFERENCES retailer_products(id),
    store_id VARCHAR(50) NOT NULL,
    cost_price DECIMAL(10,2),  -- Store-specific pricing
    in_stock BOOLEAN DEFAULT true,
    store_location VARCHAR(50),  -- Aisle/zone info
    store_zone VARCHAR(10),
    store_aisle INTEGER,
    last_checked_at TIMESTAMPTZ,
    UNIQUE(retailer_product_id, store_id)
);

-- Price history for analysis
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_product_id UUID REFERENCES retailer_products(id),
    store_id VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk item relationships (Costco multi-packs)
CREATE TABLE bulk_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bulk_product_id UUID REFERENCES products(id),
    individual_product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,  -- e.g., 24 for 24-pack
    is_automated BOOLEAN DEFAULT false,
    UNIQUE(bulk_product_id, individual_product_id)
);
```

## Key Design Decisions

1. **Barcode as VARCHAR(14)**: Accommodates UPC-12, EAN-8, EAN-13, and GTIN-14
2. **Separate retailer_products table**: Tracks same product across multiple retailers
3. **Store-specific pricing**: Enables store-by-store price comparison
4. **Bulk relationships**: Links Costco multi-packs to individual SKUs

