/**
 * Temperature Data Module Service
 *
 * Handles temperature and humidity reading operations.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { TemperatureReading } from "../models"

class TemperatureDataModuleService extends SwitchyardService({
  TemperatureReading,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createTemperatureReadings
  // - retrieveTemperatureReading
  // - listTemperatureReadings
  // - listAndCountTemperatureReadings
  // - updateTemperatureReadings
  // - deleteTemperatureReadings
  // - softDeleteTemperatureReadings
  // - restoreTemperatureReadings

  // Custom methods can be added here as needed
}

export default TemperatureDataModuleService

