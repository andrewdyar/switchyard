/**
 * Goods Source Module
 * 
 * Custom Medusa module for linking commerce products
 * back to the source catalog (source_products table).
 */

import GoodsSourceModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const GOODS_SOURCE_MODULE = "goodsSourceModuleService"

export default Module(GOODS_SOURCE_MODULE, {
  service: GoodsSourceModuleService,
})

