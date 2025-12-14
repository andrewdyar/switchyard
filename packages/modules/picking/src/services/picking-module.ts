/**
 * Picking Module Service
 * 
 * Handles RFC warehouse picking operations.
 */

import { MedusaService } from "@medusajs/framework/utils"
import { PickList } from "../models/pick-list"
import { PickListItem } from "../models/pick-list-item"

class PickingModuleService extends MedusaService({
  PickList,
  PickListItem,
}) {
  /**
   * Get pending pick lists (queue)
   */
  async getPendingPickLists() {
    return this.listPickLists({
      status: "pending",
    }, {
      order: {
        priority: "DESC",
        created_at: "ASC",
      },
    })
  }

  /**
   * Get pick lists by status
   */
  async getPickListsByStatus(status: string) {
    return this.listPickLists({
      status,
    })
  }

  /**
   * Get pick list for an order
   */
  async getPickListForOrder(orderId: string) {
    const pickLists = await this.listPickLists({
      order_id: orderId,
    })
    return pickLists[0] || null
  }

  /**
   * Get pick lists assigned to a picker
   */
  async getPickListsForPicker(pickerId: string) {
    return this.listPickLists({
      picker_id: pickerId,
      status: {
        $in: ["pending", "in_progress"],
      },
    })
  }

  /**
   * Assign pick list to a picker
   */
  async assignPickList(pickListId: string, pickerId: string) {
    return this.updatePickLists(pickListId, {
      picker_id: pickerId,
    })
  }

  /**
   * Start picking
   */
  async startPickList(pickListId: string) {
    return this.updatePickLists(pickListId, {
      status: "in_progress",
      started_at: new Date(),
    })
  }

  /**
   * Complete pick list
   */
  async completePickList(pickListId: string) {
    return this.updatePickLists(pickListId, {
      status: "completed",
      completed_at: new Date(),
    })
  }

  /**
   * Get items for a pick list (ordered by sequence for efficient path)
   */
  async getPickListItems(pickListId: string) {
    return this.listPickListItems({
      pick_list_id: pickListId,
    }, {
      order: {
        sequence: "ASC",
      },
    })
  }

  /**
   * Mark item as picked
   */
  async markItemPicked(pickListItemId: string, pickedQuantity: number, notes?: string) {
    return this.updatePickListItems(pickListItemId, {
      picked_quantity: pickedQuantity,
      status: "picked",
      notes,
    })
  }

  /**
   * Mark item as unavailable
   */
  async markItemUnavailable(pickListItemId: string, notes?: string) {
    return this.updatePickListItems(pickListItemId, {
      status: "unavailable",
      notes,
    })
  }

  /**
   * Mark item as partially picked
   */
  async markItemPartial(pickListItemId: string, pickedQuantity: number, notes?: string) {
    return this.updatePickListItems(pickListItemId, {
      picked_quantity: pickedQuantity,
      status: "partial",
      notes,
    })
  }

  /**
   * Generate optimized pick sequence for a pick list
   * This would integrate with warehouse layout (InventoryGroup) to create efficient path
   */
  async generatePickSequence(pickListId: string) {
    const items = await this.listPickListItems({
      pick_list_id: pickListId,
    })

    // TODO: Implement actual path optimization based on InventoryGroup locations
    // For now, just assign sequential numbers
    for (let i = 0; i < items.length; i++) {
      await this.updatePickListItems(items[i].id, {
        sequence: i + 1,
      })
    }

    return this.getPickListItems(pickListId)
  }
}

export default PickingModuleService
