-- Row Level Security (RLS) Policies for Goods Grocery
-- Supabase PostgreSQL RLS Configuration
-- Created: 2025-01-20

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_store_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_order_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_list_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is admin (using Supabase auth metadata)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has 'admin' role in auth.users metadata
    -- This assumes you set role in auth.users.raw_user_meta_data
    RETURN EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = user_id
        AND (raw_user_meta_data->>'role')::text = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is driver
CREATE OR REPLACE FUNCTION is_driver(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM drivers
        WHERE drivers.user_id = is_driver.user_id
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID from auth context
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
    SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own record
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (is_admin(auth.uid()));

-- Admins can insert users
CREATE POLICY "Admins can insert users"
    ON users FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Service role (backend) can do anything
CREATE POLICY "Service role full access to users"
    ON users FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PRODUCTS TABLE POLICIES (Public read, admin write)
-- ============================================================================

-- Everyone can read products (public catalog)
CREATE POLICY "Products are publicly readable"
    ON products FOR SELECT
    USING (TRUE);

-- Only admins/service role can modify products
CREATE POLICY "Only admins can modify products"
    ON products FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- Similar policies for product-related tables
CREATE POLICY "Product groups are publicly readable"
    ON product_groups FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify product groups"
    ON product_groups FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Categories are publicly readable"
    ON categories FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify categories"
    ON categories FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Product store mappings are publicly readable"
    ON product_store_mappings FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify product store mappings"
    ON product_store_mappings FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Product pricing is publicly readable"
    ON product_pricing FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify product pricing"
    ON product_pricing FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create orders for themselves
CREATE POLICY "Users can create own orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending/confirmed orders (for cancellations, etc.)
CREATE POLICY "Users can update own pending orders"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id AND status IN ('pending', 'confirmed'))
    WITH CHECK (auth.uid() = user_id);

-- Admins/drivers/service role can view all orders
CREATE POLICY "Admins and drivers can view all orders"
    ON orders FOR SELECT
    USING (
        is_admin(auth.uid()) 
        OR is_driver(auth.uid()) 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- Admins/service role can update any order
CREATE POLICY "Admins can update any order"
    ON orders FOR UPDATE
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- ORDER ITEMS TABLE POLICIES
-- ============================================================================

-- Users can view items in their own orders
CREATE POLICY "Users can view own order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Service role can insert order items (done during order creation)
CREATE POLICY "Service role can manage order items"
    ON order_items FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admins/drivers can view all order items
CREATE POLICY "Admins and drivers can view all order items"
    ON order_items FOR SELECT
    USING (
        is_admin(auth.uid()) 
        OR is_driver(auth.uid()) 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- ============================================================================
-- ORDER STATUS HISTORY TABLE POLICIES
-- ============================================================================

-- Users can view status history of their own orders
CREATE POLICY "Users can view own order status history"
    ON order_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_status_history.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Service role/admins can insert status history
CREATE POLICY "Service role can manage order status history"
    ON order_status_history FOR ALL
    USING (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()))
    WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()));

-- Admins/drivers can view all status history
CREATE POLICY "Admins and drivers can view all order status history"
    ON order_status_history FOR SELECT
    USING (
        is_admin(auth.uid()) 
        OR is_driver(auth.uid()) 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- ============================================================================
-- INVENTORY TABLE POLICIES
-- ============================================================================

-- Public can view inventory (for product availability)
CREATE POLICY "Inventory is publicly readable"
    ON inventory FOR SELECT
    USING (TRUE);

-- Only admins/service role can modify inventory
CREATE POLICY "Only admins can modify inventory"
    ON inventory FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- Similar for inventory_locations
CREATE POLICY "Inventory locations are publicly readable"
    ON inventory_locations FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify inventory locations"
    ON inventory_locations FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SWEEPS TABLE POLICIES
-- ============================================================================

-- Drivers can view their assigned sweeps
CREATE POLICY "Drivers can view assigned sweeps"
    ON sweeps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drivers
            WHERE drivers.id = sweeps.driver_id
            AND drivers.user_id = auth.uid()
        )
    );

-- Admins/service role can manage all sweeps
CREATE POLICY "Admins can manage all sweeps"
    ON sweeps FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- Drivers can update their own assigned sweeps (status updates)
CREATE POLICY "Drivers can update assigned sweeps"
    ON sweeps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM drivers
            WHERE drivers.id = sweeps.driver_id
            AND drivers.user_id = auth.uid()
        )
    );

-- Similar policies for sweep_items
CREATE POLICY "Drivers can view assigned sweep items"
    ON sweep_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sweeps
            JOIN drivers ON drivers.id = sweeps.driver_id
            WHERE sweeps.id = sweep_items.sweep_id
            AND drivers.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage sweep items"
    ON sweep_items FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- DRIVERS TABLE POLICIES
-- ============================================================================

-- Drivers can view their own record
CREATE POLICY "Drivers can view own record"
    ON drivers FOR SELECT
    USING (user_id = auth.uid());

-- Admins/service role can manage all drivers
CREATE POLICY "Admins can manage drivers"
    ON drivers FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- ROUTES TABLE POLICIES
-- ============================================================================

-- Drivers can view their own routes
CREATE POLICY "Drivers can view own routes"
    ON routes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drivers
            WHERE drivers.id = routes.driver_id
            AND drivers.user_id = auth.uid()
        )
    );

-- Admins/service role can manage all routes
CREATE POLICY "Admins can manage routes"
    ON routes FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PURCHASES TABLE POLICIES
-- ============================================================================

-- Drivers can view purchases they uploaded
CREATE POLICY "Drivers can view own purchases"
    ON purchases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drivers
            WHERE drivers.id = purchases.driver_id
            AND drivers.user_id = auth.uid()
        )
    );

-- Drivers can insert purchases (receipt uploads)
CREATE POLICY "Drivers can upload purchases"
    ON purchases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM drivers
            WHERE drivers.id = purchases.driver_id
            AND drivers.user_id = auth.uid()
        )
    );

-- Admins/service role can manage all purchases
CREATE POLICY "Admins can manage purchases"
    ON purchases FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- Similar for purchase_items
CREATE POLICY "Service role can manage purchase items"
    ON purchase_items FOR ALL
    USING (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()))
    WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()));

-- ============================================================================
-- PICK LISTS TABLE POLICIES
-- ============================================================================

-- Drivers can view pick lists assigned to them
CREATE POLICY "Drivers can view assigned pick lists"
    ON pick_lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drivers
            WHERE drivers.id = pick_lists.picker_id
            AND drivers.user_id = auth.uid()
        )
    );

-- Admins/service role can manage all pick lists
CREATE POLICY "Admins can manage pick lists"
    ON pick_lists FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- Similar for pick_list_items
CREATE POLICY "Service role can manage pick list items"
    ON pick_list_items FOR ALL
    USING (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()))
    WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()));

-- ============================================================================
-- STORES AND PICKUP PORTALS (Public read, admin write)
-- ============================================================================

CREATE POLICY "Stores are publicly readable"
    ON stores FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify stores"
    ON stores FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Pickup portals are publicly readable"
    ON pickup_portals FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins can modify pickup portals"
    ON pickup_portals FOR ALL
    USING (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role')
    WITH CHECK (is_admin(auth.uid()) OR auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SWEEP ORDER ALLOCATIONS (Admin/Service role only)
-- ============================================================================

CREATE POLICY "Service role can manage sweep order allocations"
    ON sweep_order_allocations FOR ALL
    USING (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()))
    WITH CHECK (auth.jwt()->>'role' = 'service_role' OR is_admin(auth.uid()));

