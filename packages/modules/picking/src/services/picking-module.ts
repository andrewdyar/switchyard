/**
 * Picking Module Service
 * 
 * Handles RFC warehouse picking operations.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { PickList } from "../models/pick-list"
import { PickListItem } from "../models/pick-list-item"

class PickingModuleService extends SwitchyardService({
  PickList,
  PickListItem,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createPickLists / createPickListItems
  // - retrievePickList / retrievePickListItem
  // - listPickLists / listPickListItems
  // - listAndCountPickLists / listAndCountPickListItems
  // - updatePickLists / updatePickListItems
  // - deletePickLists / deletePickListItems
  // - softDeletePickLists / softDeletePickListItems
  // - restorePickLists / restorePickListItems
  
  // Custom methods can be added here as needed
}

export default PickingModuleService

