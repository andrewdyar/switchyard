/**
 * OrderClaimItemImage Model - Stubbed
 */

import { model } from "@switchyard/framework/utils"

export const OrderClaimItemImage = model.define("OrderClaimItemImage", {
  id: model.id({ prefix: "clmimg" }).primaryKey(),
  claim_item_id: model.text().nullable(),
  url: model.text().nullable(),
  metadata: model.json().nullable(),
})
