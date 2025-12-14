/**
 * Sweeps Module Service
 * 
 * Handles sweep operations - daily retailer shopping trips.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { Sweep } from "../models/sweep"
import { SweepItem } from "../models/sweep-item"

class SweepsModuleService extends SwitchyardService({
  Sweep,
  SweepItem,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createSweeps / createSweepItems
  // - retrieveSweep / retrieveSweepItem  
  // - listSweeps / listSweepItems
  // - listAndCountSweeps / listAndCountSweepItems
  // - updateSweeps / updateSweepItems
  // - deleteSweeps / deleteSweepItems
  // - softDeleteSweeps / softDeleteSweepItems
  // - restoreSweeps / restoreSweepItems
  
  // Custom methods can be added here as needed
}

export default SweepsModuleService
