/**
 * OrderAddress Model - Stubbed
 * 
 * Not used in Goods architecture. Orders use location_id instead.
 */

import { model } from "@switchyard/framework/utils"

export const OrderAddress = model.define("OrderAddress", {
  id: model.id({ prefix: "ordaddr" }).primaryKey(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  address_1: model.text().nullable(),
  city: model.text().nullable(),
  country_code: model.text().nullable(),
  postal_code: model.text().nullable(),
  metadata: model.json().nullable(),
})
