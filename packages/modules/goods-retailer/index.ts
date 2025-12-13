/**
 * Goods Retailer Module
 * 
 * Custom Medusa module for handling Goods' multi-retailer
 * product sourcing model. Tracks which products are available
 * at which retailers and at what prices.
 */

import GoodsRetailerModuleService from "./service"
import { Module } from "@switchyard/framework/utils"

export const GOODS_RETAILER_MODULE = "goodsRetailerModuleService"

export default Module(GOODS_RETAILER_MODULE, {
  service: GoodsRetailerModuleService,
})

