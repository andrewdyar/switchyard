/**
 * OrderChange Model - Stubbed
 * 
 * Not used in Goods architecture. Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"

export const OrderChange = model.define("OrderChange", {
  id: model.id({ prefix: "ordch" }).primaryKey(),
  order_id: model.text(),  // Required - cannot be null
  status: model.text().nullable(),
  change_type: model.text().nullable(),
  metadata: model.json().nullable(),
})
