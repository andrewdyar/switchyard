/**
 * Goods Attributes Module
 * 
 * Custom Medusa module for Goods-specific product attributes
 * like brand, dietary flags, and merchandising flags.
 */

import GoodsAttributesModuleService from "./service"
import { Module } from "@switchyard/framework/utils"

export const GOODS_ATTRIBUTES_MODULE = "goodsAttributesModuleService"

export default Module(GOODS_ATTRIBUTES_MODULE, {
  service: GoodsAttributesModuleService,
})

