/**
 * OrderExchange Model - Stubbed
 * 
 * Not used in Goods architecture.
 */

import { model } from "@switchyard/framework/utils"

export const OrderExchange = model.define("OrderExchange", {
  id: model.id({ prefix: "ordexc" }).primaryKey(),
  order_id: model.text().nullable(),
  metadata: model.json().nullable(),
})
