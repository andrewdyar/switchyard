/**
 * ProductOptionValue Model - Stubbed
 * 
 * No product_option_value table exists in Supabase. This is kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"
import ProductOption from "./product-option"
import ProductVariant from "./product-variant"

const ProductOptionValue = model
  .define("ProductOptionValue", {
    id: model.id({ prefix: "optval" }).primaryKey(),
    value: model.text(),
    metadata: model.json().nullable(),
    option: model
      .belongsTo(() => ProductOption, {
        mappedBy: "values",
      })
      .nullable(),
    variants: model.manyToMany(() => ProductVariant, {
      mappedBy: "options",
    }),
  })
  .indexes([
    {
      name: "IDX_option_value_option_id_unique",
      on: ["option_id", "value"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductOptionValue
