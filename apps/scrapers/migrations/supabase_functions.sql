-- Database Functions for Goods Grocery
-- Supabase PostgreSQL Functions
-- Created: 2025-01-20

-- ============================================================================
-- PRODUCT PRICING FUNCTIONS
-- ============================================================================

-- Function to get current price for a product
CREATE OR REPLACE FUNCTION get_current_price(product_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_price DECIMAL(10,2);
BEGIN
    SELECT price INTO current_price
    FROM product_pricing
    WHERE product_id = product_uuid
    AND (effective_to IS NULL OR effective_to > NOW())
    ORDER BY effective_from DESC
    LIMIT 1;
    
    RETURN COALESCE(current_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set new price for a product (automatically sets effective_to on old price)
CREATE OR REPLACE FUNCTION set_product_price(
    product_uuid UUID,
    new_price DECIMAL(10,2),
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
    pricing_id UUID;
BEGIN
    -- End the current price
    UPDATE product_pricing
    SET effective_to = effective_from
    WHERE product_id = product_uuid
    AND effective_to IS NULL;
    
    -- Insert new price
    INSERT INTO product_pricing (product_id, price, effective_from)
    VALUES (product_uuid, new_price, effective_from)
    RETURNING id INTO pricing_id;
    
    RETURN pricing_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INVENTORY FUNCTIONS
-- ============================================================================

-- Function to get available quantity for a product (across all locations)
CREATE OR REPLACE FUNCTION get_available_quantity(product_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_available INTEGER;
BEGIN
    SELECT COALESCE(SUM(available_quantity), 0) INTO total_available
    FROM inventory
    WHERE product_id = product_uuid;
    
    RETURN total_available;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to reserve inventory for an order
CREATE OR REPLACE FUNCTION reserve_inventory(
    product_uuid UUID,
    quantity_to_reserve INTEGER,
    location_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    available_qty INTEGER;
    location_record RECORD;
BEGIN
    -- If location specified, try that location first
    IF location_uuid IS NOT NULL THEN
        SELECT available_quantity INTO available_qty
        FROM inventory
        WHERE product_id = product_uuid
        AND location_id = location_uuid;
        
        IF available_qty >= quantity_to_reserve THEN
            UPDATE inventory
            SET reserved_quantity = reserved_quantity + quantity_to_reserve,
                updated_at = NOW()
            WHERE product_id = product_uuid
            AND location_id = location_uuid;
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Otherwise, try to reserve from any available location (FIFO)
    FOR location_record IN
        SELECT id, available_quantity
        FROM inventory
        WHERE product_id = product_uuid
        AND available_quantity > 0
        ORDER BY updated_at ASC
    LOOP
        IF location_record.available_quantity >= quantity_to_reserve THEN
            UPDATE inventory
            SET reserved_quantity = reserved_quantity + quantity_to_reserve,
                updated_at = NOW()
            WHERE id = location_record.id;
            RETURN TRUE;
        END IF;
    END LOOP;
    
    -- Not enough inventory available
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to release reserved inventory
CREATE OR REPLACE FUNCTION release_inventory(
    product_uuid UUID,
    quantity_to_release INTEGER,
    location_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF location_uuid IS NOT NULL THEN
        UPDATE inventory
        SET reserved_quantity = GREATEST(0, reserved_quantity - quantity_to_release),
            updated_at = NOW()
        WHERE product_id = product_uuid
        AND location_id = location_uuid;
    ELSE
        -- Release from location with highest reserved quantity
        UPDATE inventory
        SET reserved_quantity = GREATEST(0, reserved_quantity - quantity_to_release),
            updated_at = NOW()
        WHERE product_id = product_uuid
        AND reserved_quantity > 0
        ORDER BY reserved_quantity DESC
        LIMIT 1;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to adjust inventory (add or subtract)
CREATE OR REPLACE FUNCTION adjust_inventory(
    product_uuid UUID,
    quantity_delta INTEGER,
    location_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- If location specified
    IF location_uuid IS NOT NULL THEN
        INSERT INTO inventory (product_id, location_id, quantity, updated_at)
        VALUES (product_uuid, location_uuid, quantity_delta, NOW())
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET
            quantity = inventory.quantity + quantity_delta,
            updated_at = NOW();
    ELSE
        -- Add to first location for this product, or create new location
        INSERT INTO inventory (product_id, quantity, updated_at)
        VALUES (product_uuid, quantity_delta, NOW())
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ORDER FUNCTIONS
-- ============================================================================

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    year_part TEXT;
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '(\d+)$') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM orders
    WHERE order_number LIKE 'ORD-' || year_part || '-%';
    
    order_num := 'ORD-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update order status and log to history
CREATE OR REPLACE FUNCTION update_order_status(
    order_uuid UUID,
    new_status TEXT,
    changed_by_uuid UUID DEFAULT NULL,
    notes_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update order status
    UPDATE orders
    SET status = new_status,
        updated_at = NOW()
    WHERE id = order_uuid;
    
    -- Log to history
    INSERT INTO order_status_history (order_id, status, changed_by, notes)
    VALUES (order_uuid, new_status, changed_by_uuid, notes_text);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to determine if order requires sweeps (has items not in RFC)
CREATE OR REPLACE FUNCTION order_requires_sweep(order_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_sweep_items BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM order_items oi
        JOIN inventory i ON i.product_id = oi.product_id
        WHERE oi.order_id = order_uuid
        AND (i.available_quantity IS NULL OR i.available_quantity < oi.quantity)
        AND (oi.source IS NULL OR oi.source = 'sweep')
    ) INTO has_sweep_items;
    
    RETURN has_sweep_items;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SWEEP FUNCTIONS
-- ============================================================================

-- Function to calculate total items for a sweep
CREATE OR REPLACE FUNCTION calculate_sweep_total_items(sweep_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_items INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO total_items
    FROM sweep_items
    WHERE sweep_id = sweep_uuid;
    
    -- Update sweep record
    UPDATE sweeps
    SET total_items = total_items,
        updated_at = NOW()
    WHERE id = sweep_uuid;
    
    RETURN total_items;
END;
$$ LANGUAGE plpgsql;

-- Function to get lowest price store for a product
CREATE OR REPLACE FUNCTION get_lowest_price_store(product_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    store_name TEXT;
BEGIN
    -- This is a simplified version - in practice, you'd query store prices
    -- For now, return first available store mapping
    SELECT psm.store_name INTO store_name
    FROM product_store_mappings psm
    WHERE psm.product_id = product_uuid
    AND psm.is_active = TRUE
    LIMIT 1;
    
    RETURN store_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PURCHASE/MARGIN FUNCTIONS
-- ============================================================================

-- Function to calculate average cost per product from purchases
CREATE OR REPLACE FUNCTION get_average_product_cost(
    product_uuid UUID,
    days_back INTEGER DEFAULT 90
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    avg_cost DECIMAL(10,2);
BEGIN
    SELECT COALESCE(AVG(unit_price), 0) INTO avg_cost
    FROM purchase_items
    WHERE product_id = product_uuid
    AND purchase_id IN (
        SELECT id FROM purchases
        WHERE purchase_date >= NOW() - (days_back || ' days')::INTERVAL
        AND status = 'processed'
    );
    
    RETURN avg_cost;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate margin for a product
CREATE OR REPLACE FUNCTION calculate_product_margin(
    product_uuid UUID,
    days_back INTEGER DEFAULT 90
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_price DECIMAL(10,2);
    avg_cost DECIMAL(10,2);
    margin DECIMAL(10,2);
BEGIN
    current_price := get_current_price(product_uuid);
    avg_cost := get_average_product_cost(product_uuid, days_back);
    
    IF current_price > 0 AND avg_cost > 0 THEN
        margin := current_price - avg_cost;
    ELSE
        margin := 0;
    END IF;
    
    RETURN margin;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate margin percentage
CREATE OR REPLACE FUNCTION calculate_product_margin_percentage(
    product_uuid UUID,
    days_back INTEGER DEFAULT 90
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    current_price DECIMAL(10,2);
    avg_cost DECIMAL(10,2);
    margin_pct DECIMAL(5,2);
BEGIN
    current_price := get_current_price(product_uuid);
    avg_cost := get_average_product_cost(product_uuid, days_back);
    
    IF current_price > 0 AND avg_cost > 0 THEN
        margin_pct := ((current_price - avg_cost) / current_price) * 100;
    ELSE
        margin_pct := 0;
    END IF;
    
    RETURN margin_pct;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PICK LIST FUNCTIONS
-- ============================================================================

-- Function to generate optimized pick list for an order
-- Orders items by location (zone, shelf, bin) for efficient picking
CREATE OR REPLACE FUNCTION generate_pick_list(order_uuid UUID)
RETURNS UUID AS $$
DECLARE
    pick_list_uuid UUID;
    order_item RECORD;
    location_record RECORD;
    seq_num INTEGER := 1;
BEGIN
    -- Create pick list
    INSERT INTO pick_lists (order_id, status)
    VALUES (order_uuid, 'pending')
    RETURNING id INTO pick_list_uuid;
    
    -- Add items ordered by location
    FOR order_item IN
        SELECT oi.id as order_item_id, oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = order_uuid
        AND oi.source = 'rfc' OR oi.source IS NULL
    LOOP
        -- Find location for this product
        SELECT il.id INTO location_record.id
        FROM inventory_locations il
        JOIN inventory i ON i.location_id = il.id
        WHERE i.product_id = order_item.product_id
        AND i.available_quantity > 0
        ORDER BY il.zone, il.shelf, il.bin
        LIMIT 1;
        
        -- Insert pick list item
        INSERT INTO pick_list_items (
            pick_list_id,
            order_item_id,
            product_id,
            location_id,
            quantity,
            sequence
        )
        VALUES (
            pick_list_uuid,
            order_item.order_item_id,
            order_item.product_id,
            location_record.id,
            order_item.quantity,
            seq_num
        );
        
        seq_num := seq_num + 1;
    END LOOP;
    
    RETURN pick_list_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to check if current time is before 1 PM cutoff
CREATE OR REPLACE FUNCTION is_before_cutoff(check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_time := DATE_TRUNC('day', check_time) + INTERVAL '13 hours'; -- 1 PM
    RETURN check_time < cutoff_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate estimated pickup time based on order time and cutoff
CREATE OR REPLACE FUNCTION calculate_estimated_pickup_time(
    order_time TIMESTAMP WITH TIME ZONE,
    requires_sweep BOOLEAN
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    cutoff_time TIMESTAMP WITH TIME ZONE;
    pickup_time TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_time := DATE_TRUNC('day', order_time) + INTERVAL '13 hours'; -- 1 PM
    
    IF requires_sweep THEN
        -- Sweep items: available after 3 PM
        IF order_time < cutoff_time THEN
            -- Before 1 PM: same day at 3 PM
            pickup_time := DATE_TRUNC('day', order_time) + INTERVAL '15 hours'; -- 3 PM
        ELSE
            -- After 1 PM: next day at 3 PM
            pickup_time := (DATE_TRUNC('day', order_time) + INTERVAL '1 day') + INTERVAL '15 hours';
        END IF;
    ELSE
        -- RFC items: 5 minutes from order time
        pickup_time := order_time + INTERVAL '5 minutes';
    END IF;
    
    RETURN pickup_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

