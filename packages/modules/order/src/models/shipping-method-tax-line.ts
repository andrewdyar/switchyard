/**
 * OrderShippingMethodTaxLine Model - Stubbed
 */

import { model } from "@switchyard/framework/utils"

export const OrderShippingMethodTaxLine = model.define("OrderShippingMethodTaxLine", {
  id: model.id({ prefix: "ordsmtax" }).primaryKey(),
  shipping_method_id: model.text().nullable(),
  rate: model.number().nullable(),
  metadata: model.json().nullable(),
})
