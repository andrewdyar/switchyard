/**
 * Goods Sweep Item Model
 * 
 * Aggregated items per sweep - totals across all orders for that store.
 * Example: If Order A needs 2 milk and Order B needs 3 milk,
 * the sweep item shows 5 milk total.
 */

import { model } from "@medusajs/framework/utils"

export const SweepItem = model.define("goods_sweep_item", {
  id: model.id().primaryKey(),
  
  // Relations
  sweep_id: model.text(),             // Links to Sweep
  product_id: model.text(),           // Links to Medusa Product
  store_item_id: model.text().nullable(), // Retailer's SKU for easy shopping
  
  // Quantities
  quantity: model.number(),           // Total needed
  picked_quantity: model.number().default(0),
  
  // Status
  status: model.text().default("pending"), // 'pending', 'picked', 'unavailable', 'substituted'
  notes: model.text().nullable(),
})

export default SweepItem

