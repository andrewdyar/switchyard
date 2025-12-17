import { Module } from "@switchyard/framework/utils"
import EquipmentNotificationsModuleService from "./services/equipment-notifications-module"

export const EQUIPMENT_NOTIFICATIONS_MODULE = "equipmentNotifications"

export default Module(EQUIPMENT_NOTIFICATIONS_MODULE, {
  service: EquipmentNotificationsModuleService,
})

export { EquipmentNotificationsModuleService }
export * from "./models"
export * from "./types"
export * from "./services/notification-service"
