/**
 * Goods Operations Module
 * 
 * Custom Switchyard module for handling Goods' operational workflows:
 * - Sweeps (daily store shopping trips)
 * - Pick lists (RFC warehouse fulfillment)
 * - Driver management
 */

import GoodsOperationsModuleService from "./service"
import { Module } from "@switchyard/framework/utils"

export const GOODS_OPERATIONS_MODULE = "goodsOperationsModuleService"

export default Module(GOODS_OPERATIONS_MODULE, {
  service: GoodsOperationsModuleService,
})

