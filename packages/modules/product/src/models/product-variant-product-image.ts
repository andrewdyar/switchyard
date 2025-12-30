/**
 * ProductVariantProductImage Model - Stub Pivot Table
 * 
 * Maps to the product_variant_image stub table in Supabase.
 * Pivot table for variant-image relationship. Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"
import ProductVariant from "./product-variant"
import ProductImage from "./product-image"

const ProductVariantProductImage = model.define(
  { tableName: "product_variant_image", name: "ProductVariantProductImage" },
  {
    id: model.id({ prefix: "pvpi" }).primaryKey(),
    variant_id: model.text(),
    image_id: model.text(),
    variant: model.belongsTo(() => ProductVariant, {
      mappedBy: "images",
    }),
    image: model.belongsTo(() => ProductImage, {
      mappedBy: "variants",
    }),
  }
)

export default ProductVariantProductImage
