/**
 * Equipment Notifications Module Service
 *
 * Handles notification assignment operations.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { AlertNotificationAssignment } from "../models"

class EquipmentNotificationsModuleService extends SwitchyardService({
  AlertNotificationAssignment,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createAlertNotificationAssignments
  // - retrieveAlertNotificationAssignment
  // - listAlertNotificationAssignments
  // - listAndCountAlertNotificationAssignments
  // - updateAlertNotificationAssignments
  // - deleteAlertNotificationAssignments
  // - softDeleteAlertNotificationAssignments
  // - restoreAlertNotificationAssignments

  // Custom methods can be added here as needed
}

export default EquipmentNotificationsModuleService

