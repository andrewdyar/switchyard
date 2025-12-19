import { Module } from "@switchyard/framework/utils"
import EquipmentModuleService from "./services/equipment-module"

export const EQUIPMENT_MODULE = "equipment"

export default Module(EQUIPMENT_MODULE, {
  service: EquipmentModuleService,
})

export { EquipmentModuleService }
export * from "./types"
export * from "./models"

