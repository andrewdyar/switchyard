/**
 * Goods Operations Module Service
 * 
 * Handles sweeps, pick lists, and driver management.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { Sweep } from "./models/sweep"
import { SweepItem } from "./models/sweep-item"
import { Driver } from "./models/driver"
import { PickList, PickListItem } from "./models/pick-list"

class GoodsOperationsModuleService extends SwitchyardService({
  Sweep,
  SweepItem,
  Driver,
  PickList,
  PickListItem,
}) {
  /**
   * Get today's sweeps with their items
   */
  async getTodaysSweeps() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return this.listSweeps({
      sweep_date: {
        $gte: today,
        $lt: tomorrow,
      },
    })
  }

  /**
   * Get sweep items for a sweep
   */
  async getSweepItems(sweepId: string) {
    return this.listSweepItems({
      sweep_id: sweepId,
    })
  }

  /**
   * Update sweep item as picked
   */
  async markItemPicked(sweepItemId: string, pickedQuantity: number, notes?: string) {
    return this.updateSweepItems(sweepItemId, {
      picked_quantity: pickedQuantity,
      status: "picked",
      notes,
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
   * Get active drivers
   */
  async getActiveDrivers() {
    return this.listDrivers({
      is_active: true,
    })
  }
}

export default GoodsOperationsModuleService

