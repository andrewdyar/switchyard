/**
 * OrderLineItemTaxLine Model - Stubbed
 */

import { model } from "@switchyard/framework/utils"

export const OrderLineItemTaxLine = model.define("OrderLineItemTaxLine", {
  id: model.id({ prefix: "ordlitax" }).primaryKey(),
  item_id: model.text().nullable(),
  rate: model.number().nullable(),
  metadata: model.json().nullable(),
})
