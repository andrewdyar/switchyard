/**
 * OrderExchangeItem Model - Stubbed
 * 
 * Not used in Goods architecture.
 */

import { model } from "@switchyard/framework/utils"

export const OrderExchangeItem = model.define("OrderExchangeItem", {
  id: model.id({ prefix: "ordexci" }).primaryKey(),
  exchange_id: model.text().nullable(),
  metadata: model.json().nullable(),
})
