/**
 * ProductCollection Model - Maps to Supabase product_collection table
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"

const ProductCollection = model
  .define(
    { tableName: "product_collection", name: "ProductCollection" },
    {
      id: model.id({ prefix: "pcol" }).primaryKey(),
      title: model.text().searchable(),
      handle: model.text().nullable(),
      metadata: model.json().nullable(),
      deleted_at: model.dateTime().nullable(),
      products: model.hasMany(() => Product, {
        mappedBy: "collection",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_collection_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductCollection
