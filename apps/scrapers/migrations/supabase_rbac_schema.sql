-- Supabase RBAC Schema for Goods Grocery
-- This migration creates the role-based access control system

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,  -- System roles can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'orders.read', 'inventory.write'
  description TEXT,
  resource VARCHAR(50) NOT NULL,       -- e.g., 'orders', 'inventory', 'users'
  action VARCHAR(20) NOT NULL,         -- e.g., 'read', 'write', 'delete', 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Create user_roles junction table (links Supabase auth.users to roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Create service_accounts table for robots
CREATE TABLE IF NOT EXISTS public.service_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,  -- Hashed API key
  role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_service_accounts_api_key_hash ON public.service_accounts(api_key_hash);

-- Insert default roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('superadmin', 'Full system access', TRUE),
  ('manager', 'Store operations management', TRUE),
  ('picker', 'Warehouse picking operations', TRUE),
  ('driver', 'Delivery operations', TRUE),
  ('robot', 'Automated system operations', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
  -- Orders
  ('orders.read', 'orders', 'read', 'View orders'),
  ('orders.write', 'orders', 'write', 'Create and update orders'),
  ('orders.delete', 'orders', 'delete', 'Cancel orders'),
  -- Inventory
  ('inventory.read', 'inventory', 'read', 'View inventory'),
  ('inventory.write', 'inventory', 'write', 'Update inventory levels'),
  ('inventory.scan', 'inventory', 'scan', 'Scan and process inventory'),
  -- Products
  ('products.read', 'products', 'read', 'View products'),
  ('products.write', 'products', 'write', 'Create and update products'),
  -- Customers
  ('customers.read', 'customers', 'read', 'View customers'),
  ('customers.write', 'customers', 'write', 'Manage customers'),
  -- Users & Roles
  ('users.read', 'users', 'read', 'View users'),
  ('users.write', 'users', 'write', 'Manage users'),
  ('roles.admin', 'roles', 'admin', 'Manage roles and permissions'),
  -- Settings
  ('settings.read', 'settings', 'read', 'View settings'),
  ('settings.write', 'settings', 'write', 'Manage settings'),
  -- Scanner
  ('scanner.use', 'scanner', 'use', 'Use scanner functionality')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to superadmin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Assign manager permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'manager' 
  AND p.name IN (
    'orders.read', 'orders.write',
    'inventory.read', 'inventory.write',
    'products.read', 'products.write',
    'customers.read', 'customers.write',
    'settings.read'
  )
ON CONFLICT DO NOTHING;

-- Assign picker permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'picker' 
  AND p.name IN (
    'inventory.read', 'inventory.write', 'inventory.scan',
    'orders.read',
    'products.read',
    'scanner.use'
  )
ON CONFLICT DO NOTHING;

-- Assign driver permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'driver' 
  AND p.name IN (
    'orders.read',
    'customers.read',
    'scanner.use'
  )
ON CONFLICT DO NOTHING;

-- Assign robot permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'robot' 
  AND p.name IN (
    'inventory.read', 'inventory.write', 'inventory.scan',
    'products.read',
    'scanner.use'
  )
ON CONFLICT DO NOTHING;

-- Create helper function to check permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id AND p.name = p_permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE(role_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get all user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user has any of multiple permissions
CREATE OR REPLACE FUNCTION public.user_has_any_permission(
  p_user_id UUID,
  p_permissions VARCHAR[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id AND p.name = ANY(p_permissions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.user_is_superadmin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.name = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow write access to superadmins" ON public.roles
  FOR ALL TO authenticated
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- RLS Policies for permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow write access to superadmins" ON public.permissions
  FOR ALL TO authenticated
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- RLS Policies for role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow write access to superadmins" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- RLS Policies for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_is_superadmin(auth.uid()));

CREATE POLICY "Allow superadmins to manage user roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- RLS Policies for service_accounts table
ALTER TABLE public.service_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow superadmins to manage service accounts" ON public.service_accounts
  FOR ALL TO authenticated
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));
