# Goods Medusa Fork

This is a fork of the MedusaJS monorepo customized for Goods Grocery.

## Key Modifications

### 1. Product Module Changes

The Product module has been modified to use Goods' existing Supabase tables:

#### Product Model (`packages/modules/product/src/models/product.ts`)
- Uses `source_products` table instead of Medusa's default `product` table
- Maps Medusa fields to Goods columns:
  - `title` → `name`
  - `thumbnail` → `image_url`
  - `description` → `description`
- Includes Goods-specific fields:
  - `brand`, `barcode`, `unit_of_measure`
  - `is_organic`, `is_gluten_free`, `is_vegan`, `is_non_gmo`
  - `is_new`, `on_ad`, `best_available`, `priced_by_weight`
  - `full_category_hierarchy`, `product_page_url`

#### Product Variant Model (`packages/modules/product/src/models/product-variant.ts`)
- Uses `product_skus` table instead of Medusa's `product_variant` table
- Maps fields:
  - `sku` → `sku_id`
  - `barcode` → `upc`
  - `title` → `customer_friendly_size`
- Includes `store_name` and `is_primary` for retailer-specific SKUs

#### Product Category Model (`packages/modules/product/src/models/product-category.ts`)
- Uses Goods `categories` table instead of Medusa's `product_category` table
- Uses existing `parent_id` hierarchy
- Includes Goods-specific fields:
  - `source` (for filtering by category source)
  - `level` (category depth)
  - `category_path` (full path string)

### 2. Custom Modules

Located in `packages/modules/`:

#### goods-retailer
Multi-retailer support for product sourcing:
- `RetailerMapping`: Store-to-product mappings
- `RetailerPricing`: Cost tracking per retailer

#### goods-operations
WMS/OMS functionality:
- `Sweep`: Daily store shopping trips
- `SweepItem`: Aggregated items per sweep
- `Driver`: Driver management
- `PickList`: RFC warehouse picking

#### goods-source
Source catalog linking:
- `SourceProductLink`: Links commerce products to source catalog

#### goods-attributes
Product attributes extension:
- `ProductAttributes`: Brand, dietary flags, merchandising flags, inventory type, warehouse location

### 3. Module Links

Located in `packages/modules/link-modules/src/definitions/`:

- `product-goods-attributes.ts`: Links products to goods_product_attributes
- `product-goods-retailer.ts`: Links products to retailer mappings (one-to-many)
- `product-goods-source.ts`: Links products to source catalog

## Database Schema Additions

The following columns have been added to existing Supabase tables:

### source_products
```sql
ALTER TABLE source_products 
  ADD COLUMN handle TEXT,
  ADD COLUMN status TEXT DEFAULT 'draft',
  ADD COLUMN metadata JSONB DEFAULT '{}',
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
```

### categories
```sql
ALTER TABLE categories
  ADD COLUMN handle TEXT,
  ADD COLUMN mpath TEXT,
  ADD COLUMN rank INTEGER DEFAULT 0,
  ADD COLUMN is_internal BOOLEAN DEFAULT false,
  ADD COLUMN metadata JSONB DEFAULT '{}',
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
```

### product_skus
```sql
ALTER TABLE product_skus
  ADD COLUMN metadata JSONB DEFAULT '{}';
```

## Setup

1. Copy `env.example.goods` to `.env` and fill in your Supabase credentials
2. Install dependencies: `yarn install`
3. Build modules: `yarn build`
4. Run migrations: `npx switchyard db:migrate`
5. Start development: `yarn dev`

## Development

This monorepo uses Yarn workspaces. Key commands:

- `yarn build` - Build all packages
- `yarn dev` - Start development mode
- `yarn test` - Run tests
- `yarn lint` - Run linting

## Upstream Sync

To sync with upstream Medusa:

```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts, especially in packages/modules/product/
```

## Goods-Specific Features

### Inventory Type
Products have an `inventory_type` field: "Warehouse" (stocked in RFC) or "Sweep" (sourced from sweeps).

### Warehouse Location
For Warehouse products, location is tracked with:
- `warehouse_aisle` (e.g., "3")
- `warehouse_shelf_group` (e.g., "C")
- `warehouse_shelf` (e.g., "2")
- Formatted as "3C-2"

### Retailer Sourcing
Each product can be sourced from multiple retailers (HEB, Walmart, Costco, etc.) with:
- Store-specific item ID and name
- Stock status
- List price and sale price
- Unit pricing

## Architecture

```
Supabase Tables                    Medusa Modules
─────────────────────────────────────────────────────
source_products  ─────────────────→ Product (modified)
product_skus     ─────────────────→ ProductVariant (modified)
categories       ─────────────────→ ProductCategory (modified)
product_store_mappings ───────────→ goods-retailer (custom)
product_pricing  ─────────────────→ goods-retailer (custom)
sweeps, drivers, pick_lists ──────→ goods-operations (custom)
goods_product_attributes ─────────→ goods-attributes (custom)
```



