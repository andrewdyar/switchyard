/**
 * Picking Module
 * 
 * Custom Medusa module for RFC warehouse picking operations.
 * Handles pick list generation, assignment, and item tracking.
 */

import PickingModuleService from "./services/picking-module"
import { Module } from "@medusajs/framework/utils"

export const PICKING_MODULE = "pickingModuleService"

export default Module(PICKING_MODULE, {
  service: PickingModuleService,
})

export * from "./models"
export * from "./types"
