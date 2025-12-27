/**
 * OrderLineItemAdjustment Model - Stubbed
 */

import { model } from "@switchyard/framework/utils"

export const OrderLineItemAdjustment = model.define("OrderLineItemAdjustment", {
  id: model.id({ prefix: "ordliadj" }).primaryKey(),
  item_id: model.text().nullable(),
  amount: model.bigNumber().nullable(),
  metadata: model.json().nullable(),
})
