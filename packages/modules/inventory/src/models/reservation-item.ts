/**
 * ReservationItem Model - DEPRECATED for Goods
 * 
 * The Goods schema tracks reservations via `reserved_quantity` directly
 * on `inventory_items`, rather than a separate reservation_item table.
 * 
 * This model is kept as a stub for backward compatibility but is not used.
 */

import { model } from "@switchyard/framework/utils"

// Stub model - not used in Goods schema
// Reservations are tracked via reserved_quantity on inventory_items
const ReservationItem = model
  .define(
    {
      tableName: "reservation_item",  // This table doesn't exist in Supabase
      name: "ReservationItem",
    },
    {
      id: model.id({ prefix: "resitem" }).primaryKey(),
      line_item_id: model.text().nullable(),
      location_id: model.text(),
      quantity: model.bigNumber(),
      description: model.text().nullable(),
      metadata: model.json().nullable(),
    }
  )

export default ReservationItem
