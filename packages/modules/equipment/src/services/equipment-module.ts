/**
 * Equipment Module Service
 *
 * Handles equipment management operations for refrigeration monitoring.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { Equipment, EquipmentThreshold } from "../models"

class EquipmentModuleService extends SwitchyardService({
  Equipment,
  EquipmentThreshold,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createEquipments / createEquipmentThresholds
  // - retrieveEquipment / retrieveEquipmentThreshold
  // - listEquipments / listEquipmentThresholds
  // - listAndCountEquipments / listAndCountEquipmentThresholds
  // - updateEquipments / updateEquipmentThresholds
  // - deleteEquipments / deleteEquipmentThresholds
  // - softDeleteEquipments / softDeleteEquipmentThresholds
  // - restoreEquipments / restoreEquipmentThresholds

  // Custom methods can be added here as needed
}

export default EquipmentModuleService

