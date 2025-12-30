import { Module } from "@switchyard/framework/utils"
import EquipmentAlertsModuleService from "./services/equipment-alerts-module"

export const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"

export default Module(EQUIPMENT_ALERTS_MODULE, {
  service: EquipmentAlertsModuleService,
})

export { EquipmentAlertsModuleService }
export * from "./models"
export * from "./types"



