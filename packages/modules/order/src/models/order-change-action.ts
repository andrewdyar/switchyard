/**
 * OrderChangeAction Model - Stubbed
 * 
 * Not used in Goods architecture.
 */

import { model } from "@switchyard/framework/utils"

export const OrderChangeAction = model.define("OrderChangeAction", {
  id: model.id({ prefix: "ordchact" }).primaryKey(),
  order_change_id: model.text().nullable(),
  metadata: model.json().nullable(),
})
