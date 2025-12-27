/**
 * InventoryLevel Model - Stubbed
 * 
 * Not used in Goods architecture. Quantity is tracked directly on inventory_items per lot.
 */

import { model } from "@switchyard/framework/utils"

const InventoryLevel = model.define("InventoryLevel", {
  id: model.id({ prefix: "ilev" }).primaryKey(),
  location_id: model.text().nullable(),
  stocked_quantity: model.bigNumber().default(0),
  reserved_quantity: model.bigNumber().default(0),
  incoming_quantity: model.bigNumber().default(0),
  metadata: model.json().nullable(),
  inventory_item_id: model.text().nullable(),
})

export default InventoryLevel
