/**
 * Sweep Item Model
 * 
 * Aggregated items per sweep - totals across all orders for that retailer.
 * Example: If Order A needs 2 milk and Order B needs 3 milk,
 * the sweep item shows 5 milk total.
 * 
 * Items are sorted/assigned to specific orders during intake at RFC.
 */

import { model } from "@switchyard/framework/utils"

export const SweepItem = model.define("goods_sweep_item", {
  id: model.id().primaryKey(),
  
  // Relations
  sweep_id: model.text(),             // Links to Sweep
  product_id: model.text(),           // Links to Medusa Product
  store_item_id: model.text().nullable(), // Retailer's SKU for easy shopping
  
  // Quantities
  quantity: model.number(),           // Total needed across all orders
  picked_quantity: model.number().default(0),
  
  // Status
  status: model.text().default("pending"), // 'pending', 'picked', 'unavailable', 'substituted'
  
  // Substitution tracking
  substitute_product_id: model.text().nullable(), // If substituted, the replacement
  
  // Notes from driver
  notes: model.text().nullable(),
})

export default SweepItem

