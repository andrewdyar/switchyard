# Supabase Auth & RBAC Deployment Guide

This guide covers the deployment and verification of the Supabase Auth and RBAC system.

## Prerequisites

1. Supabase project created and configured
2. Environment variables set (see below)
3. Database migrations applied

## Environment Variables

Add these to your `.env` file:

```bash
# Supabase Auth Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret  # From Supabase dashboard > Settings > API

# For admin UI (if using environment-specific builds)
MEDUSA_ADMIN_SUPABASE_URL=https://your-project.supabase.co
MEDUSA_ADMIN_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

## Deployment Steps

### 1. Apply RBAC Schema Migration

Run the RBAC schema migration on your Supabase database:

```bash
# Using Supabase CLI
supabase db push --db-url $DATABASE_URL < migrations/supabase_rbac_schema.sql

# Or via Supabase Dashboard
# Go to SQL Editor and paste the contents of migrations/supabase_rbac_schema.sql
```

### 2. Build and Deploy Auth Provider

```bash
cd medusa-fork/packages/modules/providers/auth-supabase
yarn build

cd ../../..
yarn build
```

### 3. Install Dependencies

```bash
cd apps/goods-backend
yarn add @supabase/supabase-js
```

### 4. Run Medusa Migrations

```bash
npx medusa migrations run
```

### 5. Migrate Existing Users (Optional)

If you have existing Medusa users:

```bash
# Dry run first
npx ts-node scripts/migrate-users-to-supabase.ts --dry-run

# Then run migration
npx ts-node scripts/migrate-users-to-supabase.ts
```

### 6. Create First Superadmin

```bash
# In Supabase Dashboard:
# 1. Go to Authentication > Users
# 2. Click "Add user"
# 3. Create user with email and password

# Then assign superadmin role:
# SQL Editor:
INSERT INTO user_roles (user_id, role_id)
SELECT 
  'YOUR_SUPABASE_USER_ID',
  id 
FROM roles 
WHERE name = 'superadmin';
```

### 7. Start the Server

```bash
yarn dev
```

## Verification Checklist

### Phase 1: Basic Auth
- [ ] Server starts without errors
- [ ] Admin UI loads at /app
- [ ] Can log in with Supabase credentials
- [ ] Session persists across page refreshes

### Phase 2: Admin Routes
- [ ] No random 401 errors on admin pages
- [ ] All admin routes accessible when authenticated
- [ ] Customers page works
- [ ] Orders page works
- [ ] Products page works
- [ ] Inventory Groups page works (was broken)
- [ ] Settings page works

### Phase 3: RBAC
- [ ] Role Management widget appears in Settings
- [ ] Can view existing roles
- [ ] Can create custom roles
- [ ] Can assign permissions to roles
- [ ] User Roles widget shows users and their roles
- [ ] Can assign roles to users

### Phase 4: Scanner API
- [ ] GET /scanner returns status (with bearer token)
- [ ] GET /scanner/inventory/lookup works
- [ ] POST /scanner/inventory/scan works
- [ ] GET /scanner/orders works
- [ ] Permission checks work (403 without permission)

### Phase 5: Service Accounts
- [ ] Can create service account: `npx ts-node scripts/create-service-account.ts create --name "Test Bot" --role robot`
- [ ] Can authenticate with API key
- [ ] Service account has correct permissions

## Rollback Plan

If issues arise:

1. **Keep emailpass provider active** - It's configured as a fallback
2. **Users can log in with original credentials** while Supabase is being fixed
3. **Both auth systems coexist** - no data loss

To fully rollback:

```typescript
// In medusa-config.ts, update authMethodsPerActor:
authMethodsPerActor: {
  user: ["emailpass"],  // Remove "supabase"
  customer: ["emailpass"],
},
```

## Troubleshooting

### "Invalid token" errors
- Check SUPABASE_URL is correct
- Verify SUPABASE_SERVICE_ROLE_KEY has admin access
- Ensure user exists in Supabase

### "Permission denied" errors
- Check user has roles assigned in user_roles table
- Verify role has required permissions in role_permissions
- Check RLS policies are correct

### 401 on admin routes
- Verify explicit middleware is applied
- Check session is being created correctly
- Ensure cookies are being sent with requests

### Groups page 500 error
- Verify inventoryGroup module is registered in medusa-config.ts
- Run database migrations

## Security Notes

1. **Never commit** the service role key to git
2. **Use environment variables** for all secrets
3. **Rotate API keys** periodically
4. **Review RLS policies** before production
5. **Monitor service account usage** via last_used_at

