/**
 * Product Model - Maps to Supabase sellable_products
 * 
 * Each sellable_product IS the sellable unit with all variant-like attributes merged in.
 * Related products are linked via variant_groups (separate module).
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
      tableName: "sellable_products",  // Maps to Supabase sellable_products table
      name: "Product",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      
      // Reference to raw scraped product (1:1 relationship)
      scraped_product_id: model.text().nullable(),
      
      // Core product fields
      name: model.text().searchable(),
      brand: model.text().searchable().nullable(),
      description: model.text().searchable().nullable(),
      image_url: model.text().nullable(),
      
      // Size/variant-like attributes (merged into product)
      size: model.text().nullable(),
      size_uom: model.text().nullable(),
      unit_count: model.number().nullable(),
      
      // Pricing (our selling price, not retailer cost)
      selling_price: model.bigNumber(),
      price_per_unit: model.bigNumber().nullable(),
      price_per_unit_uom: model.text().nullable(),
      
      // Product attributes
      is_perishable: model.boolean().default(false),
      is_organic: model.boolean().default(false),
      is_gluten_free: model.boolean().default(false),
      is_vegan: model.boolean().default(false),
      
      // Warehouse/fulfillment
      warehouse_zone: model.text().nullable(),  // A=Ambient, C=Chilled, F=Frozen
      preferred_retailer: model.text().nullable(),
      
      // Status
      status: model.text().default("active"),  // draft, active, discontinued
      is_active: model.boolean().default(true),
      
      // Category references
      category_id: model.text().nullable(),
      subcategory_id: model.text().nullable(),
      
      // Audit fields
      created_by: model.text().nullable(),
      updated_by: model.text().nullable(),
      
      // Medusa compatibility fields (kept for service/API compatibility)
      // These map to sellable_products equivalents or are nullable
      title: model.text().nullable(),  // Maps to name
      subtitle: model.text().nullable(),
      thumbnail: model.text().nullable(),  // Maps to image_url
      handle: model.text().nullable(),
      is_giftcard: model.boolean().default(false),
      discountable: model.boolean().default(true),
      external_id: model.text().nullable(),
      metadata: model.json().nullable(),
      
      // Medusa dimension fields (not used but kept for API compatibility)
      weight: model.text().nullable(),
      length: model.text().nullable(),
      height: model.text().nullable(),
      width: model.text().nullable(),
      origin_country: model.text().nullable(),
      hs_code: model.text().nullable(),
      mid_code: model.text().nullable(),
      material: model.text().nullable(),
      
      // ---- Relationships for service compatibility (stubbed) ----
      
      // Variants (each product IS its own variant, but kept for API)
      variants: model.hasMany(() => ProductVariant, {
        mappedBy: "product",
      }),
      
      // Product type
      type: model
        .belongsTo(() => ProductType, {
          mappedBy: "products",
        })
        .nullable(),
      
      // Tags
      tags: model.manyToMany(() => ProductTag, {
        mappedBy: "products",
        pivotTable: "product_tags",
      }),
      
      // Options (for variant options - stubbed)
      options: model.hasMany(() => ProductOption, {
        mappedBy: "product",
      }),
      
      // Images (we use image_url directly, but kept for API)
      images: model.hasMany(() => ProductImage, {
        mappedBy: "product",
      }),
      
      // Collection
      collection: model
        .belongsTo(() => ProductCollection, {
          mappedBy: "products",
        })
        .nullable(),
      
      // Categories (existing - linked to Goods categories)
      categories: model.manyToMany(() => ProductCategory, {
        pivotTable: "product_category_product",
        mappedBy: "products",
      }),
    }
  )
  .cascades({
    delete: ["variants", "options", "images"],
  })
  .indexes([
    {
      name: "IDX_sellable_products_scraped_product_id",
      on: ["scraped_product_id"],
      unique: true,
      where: "deleted_at IS NULL AND scraped_product_id IS NOT NULL",
    },
    {
      name: "IDX_sellable_products_status",
      on: ["status"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_sellable_products_brand",
      on: ["brand"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_sellable_products_is_active",
      on: ["is_active"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_sellable_products_category_id",
      on: ["category_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_sellable_products_warehouse_zone",
      on: ["warehouse_zone"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_sellable_products_handle",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL AND handle IS NOT NULL",
    },
  ])

export default Product
