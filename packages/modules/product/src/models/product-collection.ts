/**
 * ProductCollection Model - Stubbed
 * 
 * No product_collection table exists in Supabase. This is kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"
import Product from "./product"

const ProductCollection = model
  .define("ProductCollection", {
    id: model.id({ prefix: "pcol" }).primaryKey(),
    title: model.text().searchable(),
    handle: model.text(),
    metadata: model.json().nullable(),
    products: model.hasMany(() => Product, {
      mappedBy: "collection",
    }),
  })
  .indexes([
    {
      name: "IDX_collection_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductCollection
