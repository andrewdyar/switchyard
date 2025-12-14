/**
 * Sweeps Module
 * 
 * Custom Medusa module for managing daily retailer shopping trips.
 * Handles sweep scheduling, driver assignment, item tracking, and substitutions.
 */

import SweepsModuleService from "./services/sweeps-module"
import { Module } from "@switchyard/framework/utils"

export const SWEEPS_MODULE = "sweepsModuleService"

export default Module(SWEEPS_MODULE, {
  service: SweepsModuleService,
})

export * from "./models"
export * from "./types"
