import { defineJoinerConfig } from "@medusajs/framework/utils"
import { InventoryGroup } from "./models"

export const INVENTORY_GROUP_MODULE = "inventoryGroup"

export const joinerConfig = defineJoinerConfig(INVENTORY_GROUP_MODULE, {
  models: [InventoryGroup],
})

