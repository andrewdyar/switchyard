/**
 * Product Query Configuration - Aligned with Supabase Schema
 * 
 * Note: We use sellable_products table which has different column names:
 * - title -> name (mapped in helpers.ts)
 * - thumbnail -> image_url (mapped in helpers.ts)
 * 
 * Relationships now have backing tables:
 * - *type -> product_type table
 * - *collection -> product_collection table
 * - *options -> product_option table
 * - *tags -> product_tag table (via product_tags pivot)
 * - *images -> product_image table
 * 
 * ProductVariant is DISABLED - we use variant_groups instead
 */

// Variant fields (mostly unused since we use variant_groups)
export const defaultAdminProductsVariantFields = [
  "id",
  "title",
  "sku",
  "metadata",
]

export const retrieveVariantConfig = {
  defaults: defaultAdminProductsVariantFields,
  isList: false,
}

export const listVariantConfig = {
  ...retrieveVariantConfig,
  defaultLimit: 50,
  isList: true,
}

export const defaultAdminProductsOptionFields = ["id", "title", "metadata"]

export const retrieveOptionConfig = {
  defaults: defaultAdminProductsOptionFields,
  isList: false,
}

export const listOptionConfig = {
  ...retrieveOptionConfig,
  defaultLimit: 50,
  isList: true,
}

// Product fields - aligned with sellable_products table
export const defaultAdminProductFields = [
  // Core Medusa fields (mapped from sellable_products)
  "id",
  "name",           // Medusa's 'title' - remapped in helpers.ts
  "description",
  "handle",         // Generated column in DB
  "status",
  "image_url",      // Medusa's 'thumbnail' - remapped in helpers.ts
  
  // FK references
  "type_id",
  "collection_id",
  "category_id",
  "subcategory_id",
  
  // Goods-specific fields from sellable_products
  "brand",
  "size",
  "size_uom",
  "unit_count",
  "selling_price",
  "price_per_unit",
  "price_per_unit_uom",
  "is_perishable",
  "is_organic",
  "is_gluten_free",
  "is_vegan",
  "warehouse_zone",
  "preferred_retailer",
  "is_active",
  "scraped_product_id",
  
  // Audit fields
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
  
  // Relationships (now have backing tables)
  "*type",
  "*collection",
  "*options",
  "*options.values",
  "*tags",
  "*images",
  "*categories",
  
  // Note: *variants is REMOVED - we use variant_groups module instead
  // Note: *sales_channels is REMOVED - module is disabled
]

export const retrieveProductQueryConfig = {
  defaults: defaultAdminProductFields,
  isList: false,
}

export const listProductQueryConfig = {
  ...retrieveProductQueryConfig,
  defaultLimit: 50,
  isList: true,
}
