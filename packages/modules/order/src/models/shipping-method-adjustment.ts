/**
 * OrderShippingMethodAdjustment Model - Stubbed
 */

import { model } from "@switchyard/framework/utils"

export const OrderShippingMethodAdjustment = model.define("OrderShippingMethodAdjustment", {
  id: model.id({ prefix: "ordsmadj" }).primaryKey(),
  shipping_method_id: model.text().nullable(),
  amount: model.bigNumber().nullable(),
  metadata: model.json().nullable(),
})
