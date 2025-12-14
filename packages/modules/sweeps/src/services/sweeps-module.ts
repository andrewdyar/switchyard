/**
 * Sweeps Module Service
 * 
 * Handles sweep operations - daily retailer shopping trips.
 */

import { MedusaService } from "@switchyard/framework/utils"
import { Sweep } from "../models/sweep"
import { SweepItem } from "../models/sweep-item"

class SweepsModuleService extends MedusaService({
  Sweep,
  SweepItem,
}) {
  /**
   * Get today's sweeps
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
   * Get sweeps by status
   */
  async getSweepsByStatus(status: string) {
    return this.listSweeps({
      status,
    })
  }

  /**
   * Get sweeps for a specific retailer
   */
  async getSweepsForStore(storeId: string) {
    return this.listSweeps({
      store_id: storeId,
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
   * Start a sweep
   */
  async startSweep(sweepId: string) {
    return this.updateSweeps(sweepId, {
      status: "in_progress",
      actual_start_time: new Date(),
    })
  }

  /**
   * Complete a sweep
   */
  async completeSweep(sweepId: string) {
    return this.updateSweeps(sweepId, {
      status: "completed",
      actual_end_time: new Date(),
    })
  }

  /**
   * Mark an item as picked
   */
  async markItemPicked(sweepItemId: string, pickedQuantity: number, notes?: string) {
    return this.updateSweepItems(sweepItemId, {
      picked_quantity: pickedQuantity,
      status: "picked",
      notes,
    })
  }

  /**
   * Mark an item as unavailable
   */
  async markItemUnavailable(sweepItemId: string, notes?: string) {
    return this.updateSweepItems(sweepItemId, {
      status: "unavailable",
      notes,
    })
  }

  /**
   * Substitute an item
   */
  async substituteItem(sweepItemId: string, substituteProductId: string, pickedQuantity: number, notes?: string) {
    return this.updateSweepItems(sweepItemId, {
      status: "substituted",
      substitute_product_id: substituteProductId,
      picked_quantity: pickedQuantity,
      notes,
    })
  }

  /**
   * Reassign item to another sweep (when item is unavailable at one retailer)
   */
  async reassignItemToSweep(sweepItemId: string, newSweepId: string) {
    const item = await this.retrieveSweepItem(sweepItemId)
    
    // Create new sweep item on target sweep
    await this.createSweepItems({
      sweep_id: newSweepId,
      product_id: item.product_id,
      store_item_id: item.store_item_id,
      quantity: item.quantity - item.picked_quantity,
      status: "pending",
    })
    
    // Mark original as unavailable
    return this.updateSweepItems(sweepItemId, {
      status: "unavailable",
      notes: `Reassigned to sweep ${newSweepId}`,
    })
  }
}

export default SweepsModuleService
