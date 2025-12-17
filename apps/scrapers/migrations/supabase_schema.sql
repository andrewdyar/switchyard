-- Goods Grocery Production Database Schema
-- Supabase PostgreSQL Schema
-- Created: 2025-01-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    vehicle_license_plate TEXT,
    rfid_tag TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rfid_tag ON users(rfid_tag);

-- 2. product_groups (For grouping related products)
CREATE TABLE product_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    parent_group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_groups_parent ON product_groups(parent_group_id);

-- 3. categories (Hierarchical from HEB/Walmart)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    source TEXT, -- 'heb', 'walmart', 'manual'
    level INTEGER DEFAULT 1, -- 1=category, 2=subcategory, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_source ON categories(source);

-- 4. products (Normalized master catalog)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    upc TEXT UNIQUE,
    product_group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    unit_of_measure TEXT DEFAULT 'each', -- 'each', 'lb', 'oz', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_upc ON products(upc);
CREATE INDEX idx_products_group ON products(product_group_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);

-- 5. product_store_mappings (Links products to store-specific SKUs)
CREATE TABLE product_store_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL, -- 'heb', 'walmart', 'costco', 'target', 'whole_foods', 'central_market', 'trader_joes'
    store_item_id TEXT NOT NULL, -- store's internal SKU/ID
    store_item_name TEXT,
    store_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, store_name, store_item_id)
);

CREATE INDEX idx_store_mappings_product ON product_store_mappings(product_id);
CREATE INDEX idx_store_mappings_store ON product_store_mappings(store_name);
CREATE INDEX idx_store_mappings_store_item ON product_store_mappings(store_item_id);

-- 6. product_pricing (Goods pricing with history)
CREATE TABLE product_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE, -- NULL = current price
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pricing_product ON product_pricing(product_id);
CREATE INDEX idx_pricing_effective ON product_pricing(product_id, effective_from);
CREATE INDEX idx_pricing_current ON product_pricing(product_id, effective_to) WHERE effective_to IS NULL;

-- 7. stores (Retailer locations)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- 'heb', 'walmart', etc.
    display_name TEXT NOT NULL, -- 'HEB', 'Walmart', etc.
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT TRUE,
    estimated_duration_minutes INTEGER DEFAULT 30, -- for Routific
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stores_name ON stores(name);
CREATE INDEX idx_stores_active ON stores(is_active) WHERE is_active = TRUE;

-- 8. inventory_locations (RFC warehouse locations)
CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone TEXT NOT NULL, -- e.g., "A", "B", "C"
    shelf TEXT, -- e.g., "A1", "A2"
    bin TEXT, -- e.g., "A1-B3"
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(zone, shelf, bin)
);

CREATE INDEX idx_inventory_locations_zone ON inventory_locations(zone);
CREATE INDEX idx_inventory_locations_active ON inventory_locations(is_active) WHERE is_active = TRUE;

-- 9. inventory (RFC warehouse stock levels)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, -- allocated to orders
    last_counted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- Generated column for available_quantity
ALTER TABLE inventory ADD COLUMN available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED;

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_location ON inventory(location_id);
CREATE INDEX idx_inventory_available ON inventory(available_quantity) WHERE available_quantity > 0;

-- 10. pickup_portals
CREATE TABLE pickup_portals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., "Portal 1"
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_portals_active ON pickup_portals(is_active) WHERE is_active = TRUE;

-- 11. orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_number TEXT UNIQUE NOT NULL, -- e.g., "ORD-2025-001234"
    status TEXT NOT NULL, -- 'pending', 'confirmed', 'sourcing', 'picking', 'ready', 'dispatched', 'picked_up', 'completed'
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT DEFAULT 'paid', -- 'paid', 'pending', 'refunded'
    payment_method TEXT,
    payment_transaction_id TEXT,
    order_cutoff_time TIMESTAMP WITH TIME ZONE, -- when order was placed relative to 1 PM cutoff
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    portal_id UUID REFERENCES pickup_portals(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_cutoff_time ON orders(order_cutoff_time);

-- 12. order_items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL, -- price at time of order
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    source TEXT, -- 'rfc', 'sweep', NULL = not yet determined
    sweep_id UUID, -- will reference sweeps table later
    picked_at TIMESTAMP WITH TIME ZONE,
    packed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_source ON order_items(source);

-- 13. order_status_history
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT
);

CREATE INDEX idx_status_history_order ON order_status_history(order_id, changed_at);

-- 14. drivers
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- if drivers have accounts
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    license_number TEXT,
    vehicle_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_active ON drivers(is_active) WHERE is_active = TRUE;

-- 15. routes (Routific routes for sweeps)
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_date DATE NOT NULL,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    routific_route_id TEXT, -- Routific API route ID
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_end_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'planned', -- 'planned', 'active', 'completed'
    store_ids UUID[], -- array of store IDs in route
    total_distance_miles DECIMAL(10,2),
    total_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_routes_date_driver ON routes(route_date, driver_id);
CREATE INDEX idx_routes_status ON routes(status);

-- 16. sweeps (Daily sweep schedules/manifests)
CREATE TABLE sweeps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    sweep_date DATE NOT NULL,
    scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- always 1 PM
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    route_id TEXT, -- Routific route ID
    total_items INTEGER DEFAULT 0,
    total_load DECIMAL(10,2), -- estimated weight/volume
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, sweep_date)
);

-- Add foreign key reference for sweep_id in order_items
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_sweep 
    FOREIGN KEY (sweep_id) REFERENCES sweeps(id) ON DELETE SET NULL;

CREATE INDEX idx_sweeps_store_date ON sweeps(store_id, sweep_date);
CREATE INDEX idx_sweeps_date_status ON sweeps(sweep_date, status);
CREATE INDEX idx_sweeps_driver ON sweeps(driver_id);

-- 17. sweep_items (Aggregated items per sweep)
CREATE TABLE sweep_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sweep_id UUID NOT NULL REFERENCES sweeps(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    store_item_id TEXT, -- store's SKU for this sweep
    quantity INTEGER NOT NULL, -- total quantity needed from store
    picked_quantity INTEGER DEFAULT 0, -- actual quantity picked
    status TEXT DEFAULT 'pending', -- 'pending', 'picked', 'missing', 'partial'
    notes TEXT
);

CREATE INDEX idx_sweep_items_sweep ON sweep_items(sweep_id);
CREATE INDEX idx_sweep_items_product ON sweep_items(product_id);
CREATE UNIQUE INDEX idx_sweep_items_unique ON sweep_items(sweep_id, product_id, store_item_id) WHERE store_item_id IS NOT NULL;
CREATE UNIQUE INDEX idx_sweep_items_unique_no_store_id ON sweep_items(sweep_id, product_id) WHERE store_item_id IS NULL;

-- 18. sweep_order_allocations (Maps sweep items back to orders)
CREATE TABLE sweep_order_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sweep_item_id UUID NOT NULL REFERENCES sweep_items(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    allocated_quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sweep_allocations_sweep_item ON sweep_order_allocations(sweep_item_id);
CREATE INDEX idx_sweep_allocations_order_item ON sweep_order_allocations(order_item_id);

-- 19. purchases (Receipt scanning for cost tracking)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sweep_id UUID REFERENCES sweeps(id) ON DELETE SET NULL,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    receipt_image_url TEXT, -- uploaded receipt image
    receipt_text TEXT, -- OCR extracted text
    total_amount DECIMAL(10,2),
    purchase_date TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'error'
    notes TEXT
);

CREATE INDEX idx_purchases_sweep ON purchases(sweep_id);
CREATE INDEX idx_purchases_store ON purchases(store_id);
CREATE INDEX idx_purchases_status ON purchases(status);

-- 20. purchase_items (Line items from receipts)
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- matched product
    store_item_id TEXT, -- store SKU if not matched
    item_name TEXT, -- from receipt OCR
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    confidence_score DECIMAL(5,2) -- OCR confidence
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(product_id);

-- 21. pick_lists (WMS pick lists)
CREATE TABLE pick_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    picker_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'picking', 'completed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pick_lists_order ON pick_lists(order_id);
CREATE INDEX idx_pick_lists_status ON pick_lists(status);

-- 22. pick_list_items
CREATE TABLE pick_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pick_list_id UUID NOT NULL REFERENCES pick_lists(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    picked_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'picked', 'missing'
    sequence INTEGER -- pick order optimized by location
);

CREATE INDEX idx_pick_list_items_list ON pick_list_items(pick_list_id, sequence);
CREATE INDEX idx_pick_list_items_order_item ON pick_list_items(order_item_id);
CREATE INDEX idx_pick_list_items_location ON pick_list_items(location_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_groups_updated_at BEFORE UPDATE ON product_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_store_mappings_updated_at BEFORE UPDATE ON product_store_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sweeps_updated_at BEFORE UPDATE ON sweeps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Customer user accounts with RFID tags for portal detection';
COMMENT ON TABLE products IS 'Normalized master product catalog';
COMMENT ON TABLE product_store_mappings IS 'Maps master products to store-specific SKUs across 7 retailers';
COMMENT ON TABLE product_pricing IS 'Goods pricing history - effective_from/effective_to track price changes';
COMMENT ON TABLE orders IS 'Customer orders with cutoff time tracking (1 PM) for sweep items';
COMMENT ON TABLE order_items IS 'Items in orders - source can be RFC or sweep';
COMMENT ON TABLE sweeps IS 'Daily sweep schedules - one per store per day, scheduled at 1 PM';
COMMENT ON TABLE sweep_items IS 'Aggregated items per sweep - totals across all orders for that store';
COMMENT ON TABLE sweep_order_allocations IS 'Maps aggregated sweep items back to individual order items';
COMMENT ON TABLE purchases IS 'Receipt tracking for margin analysis - OCR extracted from uploaded receipts';
COMMENT ON TABLE inventory IS 'RFC warehouse stock with location-based tracking and reserved quantities';

