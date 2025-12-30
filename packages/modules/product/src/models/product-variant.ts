/**
 * ProductVariant Model - Stub for Service Compatibility
 * 
 * Maps to the product_variant stub table in Supabase.
 * For actual variant functionality, use the VariantGroups module
 * (variant_groups/variant_group_members tables) instead.
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"
import ProductImage from "./product-image"
import ProductOptionValue from "./product-option-value"

const ProductVariant = model
  .define(
    { tableName: "product_variant", name: "ProductVariant" },
    {
    id: model.id({ prefix: "variant" }).primaryKey(),
    title: model.text().searchable().nullable(),
    sku: model.text().searchable().nullable(),
    barcode: model.text().searchable().nullable(),
    ean: model.text().searchable().nullable(),
    upc: model.text().searchable().nullable(),
    allow_backorder: model.boolean().default(false),
    manage_inventory: model.boolean().default(true),
    hs_code: model.text().nullable(),
    origin_country: model.text().nullable(),
    mid_code: model.text().nullable(),
    material: model.text().nullable(),
    weight: model.number().nullable(),
    length: model.number().nullable(),
    height: model.number().nullable(),
    width: model.number().nullable(),
    metadata: model.json().nullable(),
    variant_rank: model.number().default(0).nullable(),
    deleted_at: model.dateTime().nullable(),
    
    // Product relationship
    product: model
      .belongsTo(() => Product, {
        mappedBy: "variants",
      })
      .nullable(),
    
    // Option values relationship
    options: model.manyToMany(() => ProductOptionValue, {
      pivotTable: "product_variant_option",
      mappedBy: "variants",
      joinColumn: "variant_id",
      inverseJoinColumn: "option_value_id",
    }),
    
    // Images relationship
    images: model.manyToMany(() => ProductImage, {
      pivotTable: "product_variant_image",
      mappedBy: "variants",
    }),
  })
  .indexes([
    {
      name: "IDX_product_variant_product_id",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_variant_sku_unique",
      on: ["sku"],
      unique: true,
      where: "deleted_at IS NULL AND sku IS NOT NULL",
    },
  ])

export default ProductVariant
