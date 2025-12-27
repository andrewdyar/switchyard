/**
 * ReservationItem Model - Stubbed
 * 
 * Not used in Goods architecture. Reservations tracked via reserved_quantity on inventory_items.
 * Kept for service compatibility with required fields matching ReservationItemDTO.
 */

import { model } from "@switchyard/framework/utils"

const ReservationItem = model.define("ReservationItem", {
  id: model.id({ prefix: "resitem" }).primaryKey(),
  line_item_id: model.text().nullable(),
  allow_backorder: model.boolean().default(false),
  location_id: model.text(),  // Required by ReservationItemDTO
  quantity: model.bigNumber(),  // Required by ReservationItemDTO
  external_id: model.text().nullable(),
  description: model.text().nullable(),
  created_by: model.text().nullable(),
  metadata: model.json().nullable(),
  inventory_item_id: model.text(),  // Required by ReservationItemDTO
})

export default ReservationItem
