/**
 * Product Model - Modified for Goods Integration
 * 
 * Maps to Supabase `source_products` table instead of Medusa's default `product` table.
 * This allows Medusa to work directly with Goods' existing product catalog.
 */

import { model, ProductUtils } from "@medusajs/framework/utils"

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
      tableName: "source_products",  // Use Goods source_products table
      name: "Product",               // Keep Medusa's internal name for compatibility
    },
    {
      // UUID primary key (matches source_products.id)
      id: model.id().primaryKey(),
      
      // Map Medusa's title to source_products.name
      title: model.text().searchable(),
      
      // Handle for URL slugs (new column added via migration)
      handle: model.text().nullable(),
      
      // Description (already exists in source_products)
      description: model.text().searchable().nullable(),
      
      // Status (new column added via migration)
      status: model
        .enum(ProductUtils.ProductStatus)
        .default(ProductUtils.ProductStatus.DRAFT),
      
      // Map thumbnail to source_products.image_url
      thumbnail: model.text().nullable(),
      
      // Metadata (new JSONB column added via migration)
      metadata: model.json().nullable(),
      
      // ---- Goods-specific fields (map directly to source_products columns) ----
      
      // Brand
      brand: model.text().searchable().nullable(),
      
      // Barcode (UPC)
      barcode: model.text().searchable().nullable(),
      
      // Unit of measure
      unit_of_measure: model.text().default("each").nullable(),
      
      // Size and size UOM
      size: model.text().nullable(),
      size_uom: model.text().nullable(),
      
      // Full category hierarchy path
      full_category_hierarchy: model.text().nullable(),
      
      // Product page URL
      product_page_url: model.text().nullable(),
      
      // Boolean flags
      is_active: model.boolean().default(true),
      is_new: model.boolean().default(false),
      on_ad: model.boolean().default(false),
      best_available: model.boolean().default(false),
      priced_by_weight: model.boolean().default(false),
      show_coupon_flag: model.boolean().default(false),
      in_assortment: model.boolean().default(true),
      is_organic: model.boolean().default(false),
      is_gluten_free: model.boolean().default(false),
      is_vegan: model.boolean().default(false),
      is_non_gmo: model.boolean().default(false),
      needs_review: model.boolean().default(false),
      
      // ---- Medusa fields we don't use but keep for compatibility ----
      subtitle: model.text().searchable().nullable(),
      is_giftcard: model.boolean().default(false),
      weight: model.text().nullable(),
      length: model.text().nullable(),
      height: model.text().nullable(),
      width: model.text().nullable(),
      origin_country: model.text().nullable(),
      hs_code: model.text().nullable(),
      mid_code: model.text().nullable(),
      material: model.text().nullable(),
      discountable: model.boolean().default(true),
      external_id: model.text().nullable(),
      
      // ---- Relationships ----
      
      // Variants (links to product_skus)
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
      
      // Options (for variant options)
      options: model.hasMany(() => ProductOption, {
        mappedBy: "product",
      }),
      
      // Images
      images: model.hasMany(() => ProductImage, {
        mappedBy: "product",
      }),
      
      // Collection
      collection: model
        .belongsTo(() => ProductCollection, {
          mappedBy: "products",
        })
        .nullable(),
      
      // Categories (will be linked to Goods categories)
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
      name: "IDX_source_products_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_source_products_status",
      on: ["status"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_source_products_brand",
      on: ["brand"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_source_products_barcode",
      on: ["barcode"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default Product
