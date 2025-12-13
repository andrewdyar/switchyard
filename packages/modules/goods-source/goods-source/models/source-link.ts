/**
 * Goods Source Product Link Model
 * 
 * Links Switchyard products to source_products table (scraped catalog).
 * This enables tracing commerce products back to their source data.
 */

import { model } from "@switchyard/framework/utils"

export const SourceProductLink = model.define("goods_source_product_link", {
  id: model.id().primaryKey(),
  
  // Link to Switchyard product (will be linked via Module Link)
  // product_id is managed by the link table
  
  // Link to source catalog (UUID stored as text)
  source_product_id: model.text(),
  
  // Optional: track which source was used for this product
  source_store_name: model.text().nullable(),  // e.g., 'heb', 'costco'
})

export default SourceProductLink

