import { Module } from "@switchyard/framework/utils"
import InventoryGroupModuleService from "./services/inventory-group-module"

export const INVENTORY_GROUP_MODULE = "inventoryGroup"

export default Module(INVENTORY_GROUP_MODULE, {
  service: InventoryGroupModuleService,
})

export { InventoryGroupModuleService }
export * from "./types"
export * from "./models"

