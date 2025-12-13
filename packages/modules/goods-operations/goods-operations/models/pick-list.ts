/**
 * Goods Pick List Model
 * 
 * Pick lists for RFC warehouse fulfillment.
 * Generated from orders sourced from RFC inventory.
 */

import { model } from "@switchyard/framework/utils"

export const PickList = model.define("goods_pick_list", {
  id: model.id().primaryKey(),
  
  // Links to Switchyard Order
  order_id: model.text(),
  
  // Assignment
  picker_id: model.text().nullable(), // Links to Driver
  
  // Status
  status: model.text().default("pending"), // 'pending', 'in_progress', 'completed'
  started_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
})

export const PickListItem = model.define("goods_pick_list_item", {
  id: model.id().primaryKey(),
  
  // Relations
  pick_list_id: model.text(),
  order_item_id: model.text(),        // Links to Switchyard LineItem
  product_id: model.text(),           // Links to Switchyard Product
  location_id: model.text().nullable(), // Links to StockLocation (zone/shelf/bin)
  
  // Quantities
  quantity: model.number(),
  picked_quantity: model.number().default(0),
  
  // Status & sequencing
  status: model.text().default("pending"),
  sequence: model.number().nullable(), // For efficient pick path
})

export default PickList

