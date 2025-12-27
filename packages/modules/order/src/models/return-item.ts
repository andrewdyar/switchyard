/**
 * ReturnItem Model - Stubbed
 * 
 * Not used in Goods architecture. Claims are used instead.
 */

import { model } from "@switchyard/framework/utils"

export const ReturnItem = model.define("ReturnItem", {
  id: model.id({ prefix: "retitem" }).primaryKey(),
  return_id: model.text().nullable(),
  metadata: model.json().nullable(),
})
