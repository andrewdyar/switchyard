/**
 * Equipment Alerts Module Service
 *
 * Handles equipment alert operations.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { EquipmentAlert } from "../models"

class EquipmentAlertsModuleService extends SwitchyardService({
  EquipmentAlert,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createEquipmentAlerts
  // - retrieveEquipmentAlert
  // - listEquipmentAlerts
  // - listAndCountEquipmentAlerts
  // - updateEquipmentAlerts
  // - deleteEquipmentAlerts
  // - softDeleteEquipmentAlerts
  // - restoreEquipmentAlerts

  // Custom methods can be added here as needed
}

export default EquipmentAlertsModuleService
