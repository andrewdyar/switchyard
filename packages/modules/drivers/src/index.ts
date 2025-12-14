/**
 * Drivers Module
 * 
 * Custom Medusa module for managing drivers who perform sweeps and deliveries.
 */

import DriversModuleService from "./services/drivers-module"
import { Module } from "@medusajs/framework/utils"

export const DRIVERS_MODULE = "driversModuleService"

export default Module(DRIVERS_MODULE, {
  service: DriversModuleService,
})

export * from "./models"
export * from "./types"
