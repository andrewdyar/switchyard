/**
 * Product Category Model - Modified for Goods Integration
 * 
 * Maps to Supabase `categories` table instead of Medusa's default `product_category` table.
 * Uses Goods' existing category hierarchy.
 */

import { model } from "@medusajs/framework/utils"
import Product from "./product"

const ProductCategory = model
  .define(
    {
      tableName: "categories",      // Use Goods categories table
      name: "ProductCategory",       // Keep Medusa's internal name for compatibility
    },
    {
      // UUID primary key (matches categories.id)
      id: model.id().primaryKey(),
      
      // Category name
      name: model.text().searchable(),
      
      // Description
      description: model.text().searchable().nullable(),
      
      // URL-friendly handle (new column added via migration)
      handle: model.text().searchable().nullable(),
      
      // Materialized path for hierarchy (new column added via migration)
      mpath: model.text().nullable(),
      
      // Is this category active?
      is_active: model.boolean().default(true),
      
      // Is this an internal-only category?
      is_internal: model.boolean().default(false),
      
      // Display rank/order (new column added via migration)
      rank: model.number().default(0),
      
      // Metadata (new JSONB column added via migration)
      metadata: model.json().nullable(),
      
      // ---- Goods-specific fields ----
      
      // Source identifier (e.g., 'goods', 'heb', 'costco')
      source: model.text().nullable(),
      
      // Category level in hierarchy (1 = top level)
      level: model.number().default(1),
      
      // Full category path (e.g., "Dairy & eggs/Milk/Whole Milk")
      category_path: model.text().nullable(),
      
      // ---- Relationships ----
      
      // Parent category (self-referential)
      parent_category: model
        .belongsTo(() => ProductCategory, {
          mappedBy: "category_children",
        })
        .nullable(),
      
      // Child categories
      category_children: model.hasMany(() => ProductCategory, {
        mappedBy: "parent_category",
      }),
      
      // Products in this category
      products: model.manyToMany(() => Product, {
        mappedBy: "categories",
      }),
    }
  )
  .cascades({
    delete: ["category_children"],
  })
  .indexes([
    {
      name: "IDX_categories_mpath",
      on: ["mpath"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_categories_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_categories_source",
      on: ["source"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_categories_level",
      on: ["level"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_categories_parent_id",
      on: ["parent_category_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductCategory
