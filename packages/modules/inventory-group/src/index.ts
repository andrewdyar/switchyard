import { Module } from "@medusajs/framework/utils"
import InventoryGroupModuleService from "./services/inventory-group-module"

export const INVENTORY_GROUP_MODULE = "inventoryGroup"

export default Module(INVENTORY_GROUP_MODULE, {
  service: InventoryGroupModuleService,
})

export { InventoryGroupModuleService }
export * from "./types"
export * from "./models"

