/**
 * ProductVariant Model - Stubbed for Goods Architecture
 * 
 * In Goods, each sellable_product IS the sellable unit with variant attributes merged in.
 * There is no separate product_variant/product_skus table.
 * 
 * This model is kept for Medusa service compatibility but does not map to a real table.
 * The service will return Products as their own "variants" for API compatibility.
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"
import ProductImage from "./product-image"
import ProductOptionValue from "./product-option-value"
import ProductVariantProductImage from "./product-variant-product-image"

// Stub model - kept for service compatibility
const ProductVariant = model
  .define("ProductVariant", {
    id: model.id({ prefix: "variant" }).primaryKey(),
    
    // Medusa compatibility fields
    title: model.text().searchable().nullable(),
    sku: model.text().searchable().nullable(),
    barcode: model.text().searchable().nullable(),
    ean: model.text().searchable().nullable(),
    upc: model.text().searchable().nullable(),
    
    // Inventory management
    allow_backorder: model.boolean().default(false),
    manage_inventory: model.boolean().default(true),
    
    // Dimensions (not used)
    hs_code: model.text().nullable(),
    origin_country: model.text().nullable(),
    mid_code: model.text().nullable(),
    material: model.text().nullable(),
    weight: model.number().nullable(),
    length: model.number().nullable(),
    height: model.number().nullable(),
    width: model.number().nullable(),
    
    // Other
    metadata: model.json().nullable(),
    variant_rank: model.number().default(0).nullable(),
    thumbnail: model.text().nullable(),
    
    // Relationships
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
