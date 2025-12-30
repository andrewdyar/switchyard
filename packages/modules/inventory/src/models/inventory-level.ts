/**
 * InventoryLevel Model - Maps to inventory_level stub table
 * 
 * Not used in Goods architecture. Quantity is tracked directly on inventory_items per lot.
 * This stub exists for Medusa service compatibility.
 */

import { model } from "@switchyard/framework/utils"

const InventoryLevel = model.define(
  { tableName: "inventory_level", name: "InventoryLevel" },
  {
    id: model.id({ prefix: "ilev" }).primaryKey(),
    location_id: model.text().nullable(),
    stocked_quantity: model.bigNumber().default(0),
    reserved_quantity: model.bigNumber().default(0),
    incoming_quantity: model.bigNumber().default(0),
    metadata: model.json().nullable(),
    inventory_item_id: model.text().nullable(),
    deleted_at: model.dateTime().nullable(),
  }
)

export default InventoryLevel
