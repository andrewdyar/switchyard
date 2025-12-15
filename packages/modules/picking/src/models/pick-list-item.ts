/**
 * Pick List Item Model
 * 
 * Individual items to pick from RFC warehouse.
 * Includes location information for efficient pick path routing.
 */

import { model } from "@switchyard/framework/utils"

export const PickListItem = model.define("goods_pick_list_item", {
  id: model.id().primaryKey(),
  
  // Relations
  pick_list_id: model.text(),
  order_item_id: model.text(),        // Links to Medusa LineItem
  product_id: model.text(),           // Links to Medusa Product
  variant_id: model.text().nullable(), // Links to Medusa ProductVariant
  
  // Location in warehouse (links to InventoryGroup slot)
  location_id: model.text().nullable(),
  location_code: model.text().nullable(), // e.g., "A1-2-3-1"
  
  // Quantities
  quantity: model.number(),
  picked_quantity: model.number().default(0),
  
  // Status
  status: model.text().default("pending"), // 'pending', 'picked', 'unavailable', 'partial'
  
  // Sequencing for efficient pick path
  sequence: model.number().nullable(),
  
  // Notes from picker
  notes: model.text().nullable(),
})

export default PickListItem

