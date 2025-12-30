/**
 * Product Model - Maps to Supabase sellable_products table
 * 
 * This model maps to the sellable_products table with columns that now exist
 * in Supabase after migrations. It includes relationships to product sub-entities.
 * 
 * Field mappings for Medusa compatibility:
 * - title -> name (DB column)
 * - thumbnail -> image_url (DB column)
 */

import { model } from "@switchyard/framework/utils"
import ProductCategory from "./product-category"
import ProductCollection from "./product-collection"
import ProductImage from "./product-image"
import ProductOption from "./product-option"
import ProductTag from "./product-tag"
import ProductType from "./product-type"
import ProductVariant from "./product-variant"

const Product = model
  .define(
    {
      tableName: "sellable_products",
      name: "Product",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Core product fields
      scraped_product_id: model.text().nullable(),
      name: model.text().searchable(),  // Maps to Medusa's 'title'
      brand: model.text().searchable().nullable(),
      description: model.text().searchable().nullable(),
      image_url: model.text().nullable(),  // Maps to Medusa's 'thumbnail'
      
      // URL-safe slug (generated column in DB)
      handle: model.text().nullable(),
      
      // Product dimensions
      size: model.text().nullable(),
      size_uom: model.text().nullable(),
      unit_count: model.number().nullable(),
      
      // Category references
      category_id: model.text().nullable(),
      subcategory_id: model.text().nullable(),
      
      // Pricing
      selling_price: model.bigNumber(),
      price_per_unit: model.bigNumber().nullable(),
      price_per_unit_uom: model.text().nullable(),
      
      // Product attributes
      is_perishable: model.boolean().default(false),
      is_organic: model.boolean().default(false),
      is_gluten_free: model.boolean().default(false),
      is_vegan: model.boolean().default(false),
      warehouse_zone: model.text().nullable(),
      preferred_retailer: model.text().nullable(),
      
      // Status
      status: model.text().default("active"),
      is_active: model.boolean().default(true),
      
      // Audit fields
      created_by: model.text().nullable(),
      updated_by: model.text().nullable(),
      deleted_at: model.dateTime().nullable(),
      
      // Metadata (JSONB)
      metadata: model.json().nullable(),
      
      // Sub-entity foreign keys
      type_id: model.text().nullable(),
      collection_id: model.text().nullable(),
      
      // ---- Relationships to sub-entities ----
      
      // ProductType relationship
      type: model
        .belongsTo(() => ProductType, {
          mappedBy: "products",
        })
        .nullable(),
      
      // ProductCollection relationship  
      collection: model
        .belongsTo(() => ProductCollection, {
          mappedBy: "products",
        })
        .nullable(),
      
      // ProductTags (many-to-many via product_tags table)
      tags: model.manyToMany(() => ProductTag, {
        mappedBy: "products",
        pivotTable: "product_tags",
      }),
      
      // ProductOptions (one-to-many)
      options: model.hasMany(() => ProductOption, {
        mappedBy: "product",
      }),
      
      // ProductImages (one-to-many)
      images: model.hasMany(() => ProductImage, {
        mappedBy: "product",
      }),
      
      // Categories (many-to-many)
      categories: model.manyToMany(() => ProductCategory, {
        mappedBy: "products",
      }),
      
      // Variants (stub relationship for service compatibility)
      // Note: We use variant_groups module instead, but service code expects this
      variants: model.hasMany(() => ProductVariant, {
        mappedBy: "product",
      }),
    }
  )
  .cascades({
    delete: ["options", "images", "variants"],
  })
  .indexes([
    {
      name: "IDX_sellable_products_scraped_product_id",
      on: ["scraped_product_id"],
      unique: true,
      where: "scraped_product_id IS NOT NULL",
    },
    {
      name: "IDX_sellable_products_status",
      on: ["status"],
    },
    {
      name: "IDX_sellable_products_brand",
      on: ["brand"],
    },
    {
      name: "IDX_sellable_products_is_active",
      on: ["is_active"],
    },
    {
      name: "IDX_sellable_products_handle",
      on: ["handle"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_sellable_products_type_id",
      on: ["type_id"],
      where: "deleted_at IS NULL AND type_id IS NOT NULL",
    },
    {
      name: "IDX_sellable_products_collection_id",
      on: ["collection_id"],
      where: "deleted_at IS NULL AND collection_id IS NOT NULL",
    },
  ])

export default Product
