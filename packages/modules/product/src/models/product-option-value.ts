/**
 * ProductOptionValue Model - Maps to Supabase product_option_value table
 */

import { model } from "@switchyard/framework/utils"
import ProductOption from "./product-option"
import ProductVariant from "./product-variant"

const ProductOptionValue = model
  .define(
    { tableName: "product_option_value", name: "ProductOptionValue" },
    {
      id: model.id({ prefix: "optval" }).primaryKey(),
      value: model.text(),
      metadata: model.json().nullable(),
      deleted_at: model.dateTime().nullable(),
      option: model
        .belongsTo(() => ProductOption, {
          mappedBy: "values",
        })
        .nullable(),
      // Variants relationship for service compatibility
      variants: model.manyToMany(() => ProductVariant, {
        mappedBy: "options",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_option_value_option_id_unique",
      on: ["option_id", "value"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductOptionValue
