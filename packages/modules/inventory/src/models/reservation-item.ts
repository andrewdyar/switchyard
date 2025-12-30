/**
 * ReservationItem Model - Maps to reservation_item stub table
 * 
 * Not used in Goods architecture. Reservations tracked via reserved_quantity on inventory_items.
 * Kept for service compatibility with required fields matching ReservationItemDTO.
 */

import { model } from "@switchyard/framework/utils"

const ReservationItem = model.define(
  { tableName: "reservation_item", name: "ReservationItem" },
  {
    id: model.id({ prefix: "resitem" }).primaryKey(),
    line_item_id: model.text().nullable(),
    location_id: model.text(),  // Required by ReservationItemDTO
    quantity: model.bigNumber(),  // Required by ReservationItemDTO
    external_id: model.text().nullable(),
    description: model.text().nullable(),
    created_by: model.text().nullable(),
    metadata: model.json().nullable(),
    inventory_item_id: model.text(),  // Required by ReservationItemDTO
    deleted_at: model.dateTime().nullable(),
  }
)

export default ReservationItem
