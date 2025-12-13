/**
 * Product Variant Model - Modified for Goods Integration
 * 
 * Maps to Supabase `product_skus` table instead of Medusa's default `product_variant` table.
 * Each SKU in product_skus becomes a Switchyard variant.
 */

import { model } from "@switchyard/framework/utils"
import { Product, ProductImage, ProductOptionValue } from "@models"
import ProductVariantProductImage from "./product-variant-product-image"

const ProductVariant = model
  .define(
    {
      tableName: "product_skus",    // Use Goods product_skus table
      name: "ProductVariant",        // Keep Medusa's internal name for compatibility
    },
    {
      // UUID primary key (matches product_skus.id)
      id: model.id().primaryKey(),
      
      // ---- Map to product_skus columns ----
      
      // SKU identifier (use sku_id to match product_skus.sku_id column)
      sku_id: model.text().searchable().nullable(),
      
      // UPC barcode (maps to product_skus.upc)
      upc: model.text().searchable().nullable(),
      
      // Customer friendly size (use customer_friendly_size to match product_skus column)
      // This serves as the variant title (will be mapped to 'title' in API responses)
      customer_friendly_size: model.text().searchable(),
      
      // Store name (which retailer this SKU is from)
      store_name: model.text(),
      
      // Is this the primary/default variant?
      is_primary: model.boolean().default(false),
      
      // ---- Switchyard fields (keep for compatibility) ----
      
      // Also use UPC for barcode field
      barcode: model.text().searchable().nullable(),
      
      // EAN code
      ean: model.text().searchable().nullable(),
      
      // Inventory management
      allow_backorder: model.boolean().default(false),
      manage_inventory: model.boolean().default(true),
      
      // Shipping fields (not used but kept for compatibility)
      hs_code: model.text().nullable(),
      origin_country: model.text().nullable(),
      mid_code: model.text().nullable(),
      material: model.text().nullable(),
      weight: model.number().nullable(),
      length: model.number().nullable(),
      height: model.number().nullable(),
      width: model.number().nullable(),
      
      // Metadata
      metadata: model.json().nullable(),
      
      // Variant ranking
      variant_rank: model.number().default(0).nullable(),
      
      // Thumbnail
      thumbnail: model.text().nullable(),
      
      // ---- Relationships ----
      
      // Link to parent product (source_products)
      product: model
        .belongsTo(() => Product, {
          mappedBy: "variants",
        })
        .searchable()
        .nullable(),
      
      // Variant images
      images: model.manyToMany(() => ProductImage, {
        mappedBy: "variants",
        pivotEntity: () => ProductVariantProductImage,
      }),
      
      // Option values (for variant selection)
      options: model.manyToMany(() => ProductOptionValue, {
        pivotTable: "product_variant_option",
        mappedBy: "variants",
        joinColumn: "variant_id",
        inverseJoinColumn: "option_value_id",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_product_skus_product_id",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_skus_sku_unique",
      on: ["sku_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_skus_upc",
      on: ["upc"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_skus_store_name",
      on: ["store_name"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_skus_is_primary",
      on: ["is_primary"],
      unique: false,
      where: "deleted_at IS NULL AND is_primary = true",
    },
  ])

export default ProductVariant
