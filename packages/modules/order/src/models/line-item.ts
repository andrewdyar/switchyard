/**
 * OrderLineItem Model - Stubbed
 * 
 * Not used in Goods architecture. Order items are in order_items table (GoodsOrderItem).
 */

import { model } from "@switchyard/framework/utils"

export const OrderLineItem = model.define("OrderLineItem", {
  id: model.id({ prefix: "ordli" }).primaryKey(),
  title: model.text().nullable(),
  quantity: model.number().default(0),
  unit_price: model.bigNumber().nullable(),
  metadata: model.json().nullable(),
})
