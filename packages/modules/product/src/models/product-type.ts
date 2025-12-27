/**
 * ProductType Model - Stubbed
 * 
 * No product_type table exists in Supabase. This is kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"

const ProductType = model
  .define("ProductType", {
    id: model.id({ prefix: "ptyp" }).primaryKey(),
    value: model.text().searchable(),
    metadata: model.json().nullable(),
    products: model.hasMany(() => Product, {
      mappedBy: "type",
    }),
  })
  .indexes([
    {
      name: "IDX_type_value_unique",
      on: ["value"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductType
