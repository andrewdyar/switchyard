/**
 * ProductImage Model - Maps to Supabase product_image table
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"
import ProductVariant from "./product-variant"
import ProductVariantProductImage from "./product-variant-product-image"

const ProductImage = model
  .define(
    { tableName: "product_image", name: "ProductImage" },
    {
      id: model.id({ prefix: "img" }).primaryKey(),
      url: model.text(),
      metadata: model.json().nullable(),
      rank: model.number().default(0),
      deleted_at: model.dateTime().nullable(),
      product: model.belongsTo(() => Product, {
        mappedBy: "images",
      }),
      // Variants relationship (uses stub tables for service compatibility)
      variants: model.manyToMany(() => ProductVariant, {
        mappedBy: "images",
        pivotEntity: () => ProductVariantProductImage,
      }),
    }
  )
  .indexes([
    {
      name: "IDX_product_image_url",
      on: ["url"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_image_rank",
      on: ["rank"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_image_product_id",
      on: ["product_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductImage
