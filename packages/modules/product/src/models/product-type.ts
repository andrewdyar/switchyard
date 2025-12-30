/**
 * ProductType Model - Maps to Supabase product_type table
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"

const ProductType = model
  .define(
    { tableName: "product_type", name: "ProductType" },
    {
      id: model.id({ prefix: "ptyp" }).primaryKey(),
      value: model.text().searchable(),
      metadata: model.json().nullable(),
      deleted_at: model.dateTime().nullable(),
      products: model.hasMany(() => Product, {
        mappedBy: "type",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_type_value_unique",
      on: ["value"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductType
