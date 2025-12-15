/**
 * Pick List Model
 * 
 * Pick lists for RFC warehouse fulfillment.
 * Generated from orders that have items to pick from RFC inventory.
 */

import { model } from "@switchyard/framework/utils"

export const PickList = model.define("goods_pick_list", {
  id: model.id().primaryKey(),
  
  // Links to Medusa Order
  order_id: model.text(),
  
  // Assignment
  picker_id: model.text().nullable(), // Links to Driver (who acts as picker)
  
  // Status
  status: model.text().default("pending"), // 'pending', 'in_progress', 'completed'
  started_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
  
  // Priority for queue ordering
  priority: model.number().default(0),
})

export default PickList

