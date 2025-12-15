# Authentication & Authorization

This document provides comprehensive documentation for the Goods Grocery authentication and authorization system, built on Supabase Auth with Role-Based Access Control (RBAC).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Supabase Auth Integration](#supabase-auth-integration)
4. [RBAC System](#rbac-system)
   - [Database Schema](#database-schema)
   - [Roles](#roles)
   - [Permissions](#permissions)
   - [Helper Functions](#helper-functions)
5. [Actor Types](#actor-types)
6. [Backend Authentication](#backend-authentication)
   - [Auth Provider](#auth-provider)
   - [Middleware](#middleware)
   - [Protecting Routes](#protecting-routes)
7. [Service Accounts](#service-accounts)
8. [Scanner API Authentication](#scanner-api-authentication)
9. [User Management](#user-management)
10. [Code Examples](#code-examples)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The authentication system uses a hybrid approach combining Medusa's auth framework with Supabase Auth:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  (Admin UI, Mobile Apps, Scanner Devices, Automated Systems)    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Medusa Backend                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Auth Provider  │  │   Middleware    │  │  Route Handlers │ │
│  │   (Supabase)    │  │ (authenticate,  │  │                 │ │
│  │                 │  │   authorize)    │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘ │
│           │                    │                                 │
│           ▼                    ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Auth Identity Store                       ││
│  │              (Medusa auth_identity table)                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Auth Service  │  │  RBAC Tables    │  │  RLS Policies   │ │
│  │  (auth.users)   │  │ (roles, perms)  │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| Supabase Auth | User authentication, session management, password reset |
| Supabase RBAC Tables | Roles, permissions, and their assignments |
| Medusa Auth Provider | Bridge between Supabase and Medusa's auth system |
| Auth Middleware | Validates authentication on protected routes |
| Authorization Middleware | Checks permissions before allowing access |

---

## Authentication Flow

### Standard Login Flow (Admin UI)

```
1. User enters credentials in login form
                    │
                    ▼
2. Frontend calls Supabase Auth API
   POST /auth/v1/token?grant_type=password
   Body: { email, password }
                    │
                    ▼
3. Supabase validates credentials and returns JWT
   Response: { access_token, refresh_token, user }
                    │
                    ▼
4. Frontend calls Medusa auth endpoint with Supabase token
   POST /auth/user/supabase
   Body: { access_token }
                    │
                    ▼
5. Medusa Auth Provider validates token with Supabase
   - Fetches user info from Supabase
   - Retrieves roles from RBAC tables
   - Creates/updates auth_identity in Medusa
                    │
                    ▼
6. Medusa creates session cookie
   Set-Cookie: connect.sid=...
                    │
                    ▼
7. Subsequent requests include session cookie
   Cookie: connect.sid=...
```

### Bearer Token Flow (API/Mobile)

```
1. Client authenticates with Supabase
                    │
                    ▼
2. Client includes JWT in Authorization header
   Authorization: Bearer <supabase_jwt>
                    │
                    ▼
3. Medusa middleware extracts and validates token
                    │
                    ▼
4. Request proceeds with auth_context populated
```

### Service Account Flow (Robots)

```
1. Robot uses pre-generated API key
                    │
                    ▼
2. Robot calls Medusa endpoint
   POST /auth/user/supabase
   Body: { api_key: "sk_robot_..." }
                    │
                    ▼
3. Auth provider validates API key against service_accounts table
                    │
                    ▼
4. Returns auth identity with robot role/permissions
```

---

## Supabase Auth Integration

### Configuration

The Supabase auth provider is configured in `medusa-config.ts`:

```typescript
export default defineConfig({
  projectConfig: {
    http: {
      authMethodsPerActor: {
        user: ["supabase", "emailpass"],  // Admin users
        customer: ["emailpass"],           // Store customers
      },
    },
  },
  modules: {
    authProviders: [
      {
        resolve: "@medusajs/auth-emailpass",
        id: "emailpass",
      },
      {
        resolve: "@medusajs/auth-supabase",
        id: "supabase",
        options: {
          supabaseUrl: process.env.SUPABASE_URL,
          supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
          supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    ],
  },
})
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Public anon key for client-side auth | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | Yes |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification | Optional |

### Auth Provider Capabilities

The Supabase auth provider (`@medusajs/auth-supabase`) supports:

- **Email/Password Authentication**: Standard login with Supabase credentials
- **Token Validation**: Validate existing Supabase JWTs
- **Service Account Auth**: API key authentication for robots
- **Role Fetching**: Automatically retrieves user roles from RBAC tables
- **Permission Fetching**: Retrieves permissions for authorization checks
- **Identity Sync**: Creates/updates Medusa auth_identity records

---

## RBAC System

### Database Schema

The RBAC system consists of five core tables in the Supabase `public` schema:

#### roles

Stores role definitions.

```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(50) | Unique role identifier (e.g., "superadmin") |
| `description` | TEXT | Human-readable description |
| `is_system` | BOOLEAN | If true, role cannot be deleted |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### permissions

Stores permission definitions.

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | Unique permission identifier (e.g., "orders.read") |
| `description` | TEXT | Human-readable description |
| `resource` | VARCHAR(50) | Resource category (e.g., "orders", "inventory") |
| `action` | VARCHAR(20) | Action type (e.g., "read", "write", "delete") |

#### role_permissions

Junction table linking roles to permissions.

```sql
CREATE TABLE public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

#### user_roles

Junction table linking Supabase users to roles.

```sql
CREATE TABLE public.user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

#### service_accounts

Stores service accounts for automated systems.

```sql
CREATE TABLE public.service_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Roles

The system includes five default roles:

| Role | Description | System? |
|------|-------------|---------|
| `superadmin` | Full system access, bypasses all permission checks | Yes |
| `manager` | Store operations, inventory, orders, products | Yes |
| `picker` | Warehouse picking operations, inventory scanning | Yes |
| `driver` | Delivery operations, order viewing | Yes |
| `robot` | Automated system operations | Yes |

### Permissions

Permissions follow the `resource.action` naming convention:

| Permission | Resource | Action | Description |
|------------|----------|--------|-------------|
| `orders.read` | orders | read | View orders |
| `orders.write` | orders | write | Create and update orders |
| `orders.delete` | orders | delete | Cancel orders |
| `inventory.read` | inventory | read | View inventory |
| `inventory.write` | inventory | write | Update inventory levels |
| `inventory.scan` | inventory | scan | Scan and process inventory |
| `products.read` | products | read | View products |
| `products.write` | products | write | Create and update products |
| `customers.read` | customers | read | View customers |
| `customers.write` | customers | write | Manage customers |
| `users.read` | users | read | View users |
| `users.write` | users | write | Manage users |
| `roles.admin` | roles | admin | Manage roles and permissions |
| `settings.read` | settings | read | View settings |
| `settings.write` | settings | write | Manage settings |
| `scanner.use` | scanner | use | Use scanner functionality |

### Default Permission Assignments

| Role | Permissions |
|------|-------------|
| `superadmin` | All permissions |
| `manager` | orders.*, inventory.*, products.*, customers.*, settings.read |
| `picker` | inventory.*, orders.read, products.read, scanner.use |
| `driver` | orders.read, customers.read, scanner.use |
| `robot` | inventory.*, products.read, scanner.use |

### Helper Functions

The RBAC schema includes helper functions for permission checking:

#### user_has_permission

Check if a user has a specific permission.

```sql
SELECT public.user_has_permission(
  'user-uuid-here',
  'orders.read'
);
-- Returns: true/false
```

#### get_user_roles

Get all roles assigned to a user.

```sql
SELECT * FROM public.get_user_roles('user-uuid-here');
-- Returns: table of role_name
```

#### get_user_permissions

Get all permissions for a user (through their roles).

```sql
SELECT * FROM public.get_user_permissions('user-uuid-here');
-- Returns: table of permission_name
```

#### user_has_any_permission

Check if a user has any of the specified permissions.

```sql
SELECT public.user_has_any_permission(
  'user-uuid-here',
  ARRAY['orders.read', 'orders.write']
);
-- Returns: true/false
```

#### user_is_superadmin

Check if a user has the superadmin role.

```sql
SELECT public.user_is_superadmin('user-uuid-here');
-- Returns: true/false
```

---

## Actor Types

The system supports multiple actor types, each with different authentication methods:

| Actor Type | Description | Auth Methods | Typical Use |
|------------|-------------|--------------|-------------|
| `user` | Admin users | supabase, emailpass | Admin dashboard |
| `customer` | Store customers | emailpass | Storefront (future) |
| `api-key` | API key auth | api-key | External integrations |

### Configuring Actor Types

Actor types and their allowed auth methods are configured in `medusa-config.ts`:

```typescript
authMethodsPerActor: {
  user: ["supabase", "emailpass"],
  customer: ["emailpass"],
}
```

---

## Backend Authentication

### Auth Provider

The Supabase auth provider is located at `packages/modules/providers/auth-supabase/`.

#### Key Methods

**authenticate**

Authenticates a user via email/password or access token.

```typescript
async authenticate(
  req: AuthenticationInput,
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

Input options:
- `{ email, password }` - Email/password login via Supabase
- `{ access_token }` - Validate existing Supabase JWT
- `{ api_key }` - Service account authentication

**validateToken**

Validates a Supabase JWT and retrieves user info.

```typescript
private async validateToken(
  accessToken: string,
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

**authenticateServiceAccount**

Authenticates a robot/service using an API key.

```typescript
private async authenticateServiceAccount(
  apiKey: string,
  authIdentityService: AuthIdentityProviderService
): Promise<AuthenticationResponse>
```

### Middleware

The authentication system uses two types of middleware:

#### authenticate

Validates that a request is authenticated.

```typescript
import { authenticate } from "@medusajs/framework/http"

// Require authentication for admin users
authenticate("user", ["session", "bearer", "api-key"])

// Allow unauthenticated access
authenticate("user", ["session"], { allowUnauthenticated: true })

// Allow unregistered users (e.g., during invite acceptance)
authenticate("user", ["session"], { allowUnregistered: true })
```

Parameters:
- `actorType`: The actor type(s) allowed ("user", "customer", "*")
- `authType`: Authentication methods to check ("session", "bearer", "api-key")
- `options`: Optional settings

#### authorize

Checks if the authenticated user has required permissions.

```typescript
import { authorize } from "../middlewares/authorize-middleware"

// Require a single permission
authorize("orders.read")

// Require any of multiple permissions
authorize(["orders.read", "orders.write"])
```

#### requireRole

Checks if the user has a specific role.

```typescript
import { requireRole, requireSuperadmin } from "../middlewares/authorize-middleware"

// Require a specific role
requireRole("manager")

// Require any of multiple roles
requireRole(["manager", "superadmin"])

// Require superadmin
requireSuperadmin()
```

### Protecting Routes

Routes are protected by combining `AUTHENTICATE = false` with explicit middleware.

#### Route File Pattern

```typescript
// src/api/admin/my-route/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Disable global authentication - we handle it explicitly
export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Route handler
}
```

#### Middleware Configuration

```typescript
// src/api/middlewares.ts
import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import { authorize } from "../middlewares/authorize-middleware"

export default defineMiddlewares({
  routes: [
    // Admin routes with authentication
    {
      method: ["GET", "POST"],
      matcher: "/admin/orders",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    
    // Routes with permission checks
    {
      method: ["DELETE"],
      matcher: "/admin/orders/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
        authorize("orders.delete"),
      ],
    },
    
    // Scanner routes with bearer token only
    {
      method: ["POST"],
      matcher: "/scanner/inventory/scan",
      middlewares: [
        authenticate("user", ["bearer"]),
        authorize(["inventory.scan", "inventory.write"]),
      ],
    },
  ],
})
```

---

## Service Accounts

Service accounts are used for automated systems (robots, scripts, integrations).

### Creating a Service Account

Use the CLI tool:

```bash
npx ts-node scripts/create-service-account.ts create \
  --name "Inventory Scanner Bot" \
  --role robot
```

Output:
```
=== Service Account Created ===
ID: 123e4567-e89b-12d3-a456-426614174000
Name: Inventory Scanner Bot
Role: robot

API Key (save this - it will not be shown again):

  sk_robot_a1b2c3d4e5f6...

================================
```

### Managing Service Accounts

```bash
# List all service accounts
npx ts-node scripts/create-service-account.ts list

# Revoke a service account (deactivate)
npx ts-node scripts/create-service-account.ts revoke <id>

# Delete a service account
npx ts-node scripts/create-service-account.ts delete <id>
```

### Using a Service Account

```bash
# Authenticate with the API key
curl -X POST https://api.example.com/auth/user/supabase \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sk_robot_a1b2c3d4e5f6..."}'

# Use the returned session or token for subsequent requests
curl https://api.example.com/scanner/inventory/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"barcode": "012345678901"}'
```

### Service Account Security

- API keys are hashed before storage (SHA-256)
- Original key is only shown once at creation
- `last_used_at` tracks when the account was last used
- `is_active` can be set to false to revoke access
- Service accounts inherit permissions from their assigned role

---

## Scanner API Authentication

The Scanner API is designed for mobile devices used by pickers and drivers.

### Endpoints

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/scanner` | GET | scanner.use | Get scanner status |
| `/scanner/inventory/lookup` | GET | inventory.read | Look up product by barcode |
| `/scanner/inventory/scan` | POST | inventory.scan | Process inventory scan |
| `/scanner/orders` | GET | orders.read | List orders for picking |
| `/scanner/orders/:id` | GET | orders.read | Get order details |

### Authentication Flow for Mobile

```typescript
// 1. Login with Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'picker@example.com',
  password: 'password123'
})

// 2. Use the access token for API calls
const response = await fetch('/scanner/inventory/lookup?barcode=012345678901', {
  headers: {
    'Authorization': `Bearer ${data.session.access_token}`
  }
})
```

### Error Responses

```json
// 401 Unauthorized - No valid authentication
{
  "message": "Unauthorized"
}

// 403 Forbidden - Authenticated but missing permission
{
  "message": "Forbidden: Missing required permission. Required: inventory.scan"
}
```

---

## User Management

### Creating Users

Users are created in Supabase Auth, then assigned roles:

```sql
-- After creating user in Supabase Auth dashboard or API

-- Assign role to user
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  'supabase-user-uuid',
  id 
FROM public.roles 
WHERE name = 'manager';
```

### Syncing Users to Medusa

Use the sync workflow to ensure Medusa has the user's auth identity:

```typescript
import { syncSupabaseUserWorkflow } from "../workflows"

const { result } = await syncSupabaseUserWorkflow(container).run({
  input: {
    supabaseUserId: "123e4567-e89b-12d3-a456-426614174000",
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    roles: ["manager"]
  }
})
```

### Migrating Existing Users

For migrating users from Medusa's built-in auth to Supabase:

```bash
# Preview migration
npx ts-node scripts/migrate-users-to-supabase.ts --dry-run

# Run migration
npx ts-node scripts/migrate-users-to-supabase.ts
```

The migration script:
1. Reads users from Medusa's `user` table
2. Creates users in Supabase Auth
3. Assigns the default `manager` role
4. Generates password reset links
5. Updates Medusa `auth_identity` records

---

## Code Examples

### Checking Permissions in a Route Handler

```typescript
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const authContext = req.auth_context
  
  // Check if user is authenticated
  if (!authContext) {
    return res.status(401).json({ message: "Not authenticated" })
  }
  
  // Access user metadata
  const userMetadata = authContext.auth_identity?.user_metadata || {}
  const roles = userMetadata.roles || []
  const permissions = userMetadata.permissions || []
  
  // Check for superadmin
  if (roles.includes("superadmin")) {
    // Allow everything
  }
  
  // Check for specific permission
  if (!permissions.includes("inventory.write")) {
    return res.status(403).json({ message: "Permission denied" })
  }
  
  // Proceed with operation
}
```

### Creating a Custom Permission Check

```typescript
import { createClient } from "@supabase/supabase-js"

async function userCanPerformAction(
  userId: string,
  requiredPermissions: string[]
): Promise<boolean> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data, error } = await supabase.rpc("user_has_any_permission", {
    p_user_id: userId,
    p_permissions: requiredPermissions
  })
  
  return data === true
}
```

### Implementing Role-Based UI

```typescript
// In admin widget/component
const UserDashboard = ({ authContext }) => {
  const roles = authContext?.auth_identity?.user_metadata?.roles || []
  
  const isSuperadmin = roles.includes("superadmin")
  const isManager = roles.includes("manager")
  const isPicker = roles.includes("picker")
  
  return (
    <div>
      {(isSuperadmin || isManager) && (
        <ManagerDashboard />
      )}
      {isPicker && (
        <PickerDashboard />
      )}
    </div>
  )
}
```

### Refreshing Permissions Cache

```typescript
import { clearPermissionCache } from "../middlewares/authorize-middleware"

// Clear cache for specific user (after role change)
clearPermissionCache("user-uuid-here")

// Clear entire cache
clearPermissionCache()
```

---

## Security Considerations

### Best Practices

1. **Never expose service role key**: The `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side
2. **Use RLS policies**: Row Level Security provides an additional layer of protection
3. **Rotate API keys**: Periodically rotate service account API keys
4. **Audit access**: Monitor `last_used_at` for service accounts
5. **Principle of least privilege**: Assign minimum required permissions

### RLS Policies

The RBAC tables have RLS policies:

- **roles, permissions, role_permissions**: Read by all authenticated, write by superadmin only
- **user_roles**: Users can read their own roles, superadmin can manage all
- **service_accounts**: Superadmin only

### Token Expiration

Supabase JWTs expire after 1 hour by default. The auth provider automatically:
- Validates token expiration
- Returns 401 for expired tokens
- Clients should handle token refresh

### Password Requirements

Configure password requirements in Supabase Dashboard:
- Minimum length: 8 characters (recommended: 12+)
- Require uppercase, lowercase, numbers
- Enable breach detection

---

## Troubleshooting

### Common Issues

#### "Invalid token" Error

**Causes:**
- Token has expired
- Token was issued for different Supabase project
- SUPABASE_URL mismatch

**Solutions:**
- Refresh the token
- Verify environment variables match your Supabase project
- Check Supabase project settings

#### "Permission denied" Error

**Causes:**
- User doesn't have required permission
- Role doesn't have permission assigned
- Permission cache is stale

**Solutions:**
- Check user_roles table for role assignment
- Check role_permissions table for permission assignment
- Clear permission cache: `clearPermissionCache(userId)`

#### Random 401 Errors

**Causes:**
- Race condition in global auth middleware
- Session not being sent with request

**Solutions:**
- Ensure routes use explicit authentication middleware
- Check that credentials: 'include' is set on fetch requests
- Verify cookies are being sent

#### Service Account Not Working

**Causes:**
- API key typo
- Service account is inactive
- Role not assigned

**Solutions:**
- Verify API key is correct (only shown once at creation)
- Check is_active = true in service_accounts table
- Verify role_id is set

### Debugging

Enable debug logging:

```typescript
// In auth provider
this.logger_.debug("Authentication attempt", { email, hasToken: !!access_token })
```

Check Supabase logs:
- Go to Supabase Dashboard > Logs > Auth
- Filter by timestamp or user email

### Getting Help

1. Check the deployment guide: `SUPABASE_AUTH_DEPLOYMENT.md`
2. Review Supabase documentation: https://supabase.com/docs/guides/auth
3. Review Medusa auth documentation: https://docs.medusajs.com/resources/commerce-modules/auth


