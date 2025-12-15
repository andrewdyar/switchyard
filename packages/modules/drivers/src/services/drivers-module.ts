/**
 * Drivers Module Service
 * 
 * Handles driver management operations.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { Driver } from "../models/driver"

class DriversModuleService extends SwitchyardService({
  Driver,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createDrivers
  // - retrieveDriver
  // - listDrivers
  // - listAndCountDrivers
  // - updateDrivers
  // - deleteDrivers
  // - softDeleteDrivers
  // - restoreDrivers
  
  // Custom methods can be added here as needed
}

export default DriversModuleService

