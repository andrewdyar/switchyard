/**
 * ReturnReason Model - Stubbed
 * 
 * Not used in Goods architecture. Claims are used instead.
 */

import { model } from "@switchyard/framework/utils"

export const ReturnReason = model.define("ReturnReason", {
  id: model.id({ prefix: "rr" }).primaryKey(),
  value: model.text().nullable(),
  label: model.text().nullable(),
  metadata: model.json().nullable(),
})
