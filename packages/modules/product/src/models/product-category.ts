/**
 * Product Category Model - Maps to Supabase categories table
 * 
 * Uses Goods' existing category hierarchy from the categories table.
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"

const ProductCategory = model
  .define(
    {
      tableName: "categories",
      name: "ProductCategory",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Core fields
      name: model.text().searchable(),
      description: model.text().searchable().nullable(),
      handle: model.text().searchable().nullable(),
      mpath: model.text().nullable(),
      
      // Status fields
      is_active: model.boolean().default(true),
      is_internal: model.boolean().default(false),
      
      // Display
      rank: model.number().default(0),
      
      // Metadata
      metadata: model.json().nullable(),
      
      // Soft delete
      deleted_at: model.dateTime().nullable(),
      
      // Goods-specific fields
      source: model.text().nullable(),
      level: model.number().default(1),
      category_path: model.text().nullable(),
      
      // Relationships
      parent_category: model
        .belongsTo(() => ProductCategory, {
          mappedBy: "category_children",
        })
        .nullable(),
      
      category_children: model.hasMany(() => ProductCategory, {
        mappedBy: "parent_category",
      }),
      
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
      name: "IDX_categories_parent_category_id",
      on: ["parent_category_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductCategory
