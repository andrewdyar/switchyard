/**
 * OrderShippingMethod Model - Stubbed
 * 
 * Not used in Goods architecture. Fulfillment is via robot delivery.
 */

import { model } from "@switchyard/framework/utils"

export const OrderShippingMethod = model.define("OrderShippingMethod", {
  id: model.id({ prefix: "ordsm" }).primaryKey(),
  name: model.text().nullable(),
  metadata: model.json().nullable(),
})
