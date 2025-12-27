/**
 * ProductVariantProductImage Model - Stubbed
 * 
 * Pivot table for variant-image relationship. Not used in Goods architecture.
 */

import { model } from "@switchyard/framework/utils"
import ProductVariant from "./product-variant"
import ProductImage from "./product-image"

const ProductVariantProductImage = model.define("ProductVariantProductImage", {
  id: model.id({ prefix: "pvpi" }).primaryKey(),
  variant: model.belongsTo(() => ProductVariant, {
    mappedBy: "images",
  }),
  image: model.belongsTo(() => ProductImage, {
    mappedBy: "variants",
  }),
})

export default ProductVariantProductImage
