/**
 * Drivers Module Service
 * 
 * Handles driver management operations.
 */

import { MedusaService } from "@medusajs/framework/utils"
import { Driver } from "../models/driver"

class DriversModuleService extends MedusaService({
  Driver,
}) {
  /**
   * Get all active drivers
   */
  async getActiveDrivers() {
    return this.listDrivers({
      is_active: true,
    })
  }

  /**
   * Get driver by ID
   */
  async getDriverById(driverId: string) {
    return this.retrieveDriver(driverId)
  }

  /**
   * Deactivate a driver
   */
  async deactivateDriver(driverId: string) {
    return this.updateDrivers(driverId, {
      is_active: false,
    })
  }

  /**
   * Activate a driver
   */
  async activateDriver(driverId: string) {
    return this.updateDrivers(driverId, {
      is_active: true,
    })
  }
}

export default DriversModuleService
