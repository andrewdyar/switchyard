# Goods Backend Documentation

Welcome to the Goods Grocery backend documentation. This documentation covers the custom extensions, integrations, and configurations for the Switchyard-based backend.

## Documentation Index

### Core Systems

| Document | Description |
|----------|-------------|
| [Authentication](./authentication.md) | Supabase Auth integration, RBAC system, permissions |

### Deployment & Operations

| Document | Description |
|----------|-------------|
| [Supabase Auth Deployment](../SUPABASE_AUTH_DEPLOYMENT.md) | Step-by-step deployment guide for the auth system |

## Quick Links

### Authentication & Authorization

- [Architecture Overview](./authentication.md#architecture-overview)
- [RBAC System](./authentication.md#rbac-system)
- [Protecting Routes](./authentication.md#protecting-routes)
- [Service Accounts](./authentication.md#service-accounts)
- [Code Examples](./authentication.md#code-examples)

### API Reference

#### Admin Routes
All admin routes require authentication with the `user` actor type.

```
GET/POST /admin/customers
GET/POST /admin/orders
GET/POST /admin/products
GET/POST /admin/inventory-items
GET/POST /admin/inventory-groups
...
```

#### Scanner API
Scanner routes require bearer token authentication and appropriate permissions.

```
GET  /scanner                      - Scanner status
GET  /scanner/inventory/lookup     - Product lookup
POST /scanner/inventory/scan       - Process scan
GET  /scanner/orders               - List orders
GET  /scanner/orders/:id           - Order details
```

## Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://...

# Switchyard
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Optional

```bash
# Supabase (optional)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# CORS
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000
```

## Project Structure

```
apps/goods-backend/
├── docs/                    # Documentation
│   ├── README.md           # This file
│   └── authentication.md   # Auth documentation
├── scripts/                 # Utility scripts
│   ├── create-service-account.ts
│   └── migrate-users-to-supabase.ts
├── src/
│   ├── api/                # API routes
│   │   ├── middlewares.ts  # Route middleware config
│   │   └── scanner/        # Scanner API
│   ├── middlewares/        # Custom middleware
│   │   └── authorize-middleware.ts
│   └── workflows/          # Custom workflows
│       └── sync-supabase-user.ts
├── switchyard.config.ts        # Switchyard configuration
└── SUPABASE_AUTH_DEPLOYMENT.md
```

## Getting Started

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run migrations**
   ```bash
   # Switchyard migrations
   npx switchyard migrations run
   
   # Supabase RBAC schema
   # Apply migrations/supabase_rbac_schema.sql to your Supabase database
   ```

4. **Start development server**
   ```bash
   yarn dev
   ```

## Contributing

When adding new documentation:

1. Create markdown files in the `docs/` directory
2. Update this README with links to new documents
3. Follow the existing documentation structure
4. Include code examples where appropriate

## Support

For issues or questions:
- Check the [Troubleshooting](./authentication.md#troubleshooting) section
- Review Switchyard documentation: https://docs.switchyard.com
- Review Supabase documentation: https://supabase.com/docs
