import InventoryModuleService from "./services/inventory-module"
import { Module, Modules } from "@switchyard/framework/utils"

export default Module(Modules.INVENTORY, {
  service: InventoryModuleService,
})
