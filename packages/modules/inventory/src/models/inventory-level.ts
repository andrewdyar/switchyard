/**
 * InventoryLevel Model - DEPRECATED for Goods
 * 
 * The Goods schema uses `inventory_items` directly with location_id,
 * rather than a separate inventory_level join table.
 * 
 * This model is kept as a stub for backward compatibility but is not used.
 * The inventory_locations table provides location data directly.
 */

import { model } from "@switchyard/framework/utils"

// Stub model - not used in Goods schema
// Inventory levels are tracked directly on inventory_items via quantity and location_id
const InventoryLevel = model
  .define(
    {
      tableName: "inventory_level",  // This table doesn't exist in Supabase
      name: "InventoryLevel",
    },
    {
      id: model.id({ prefix: "ilev" }).primaryKey(),
      location_id: model.text(),
      stocked_quantity: model.bigNumber().default(0),
      reserved_quantity: model.bigNumber().default(0),
      incoming_quantity: model.bigNumber().default(0),
      metadata: model.json().nullable(),
    }
  )

export default InventoryLevel
