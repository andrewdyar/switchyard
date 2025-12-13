/**
 * Goods Retailer Module Service
 * 
 * Handles multi-retailer product mappings and pricing.
 * This extends SwitchyardService to get auto-generated CRUD methods.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { RetailerMapping } from "./models/retailer-mapping"
import { RetailerPricing } from "./models/retailer-pricing"

class GoodsRetailerModuleService extends SwitchyardService({
  RetailerMapping,
  RetailerPricing,
}) {
  /**
   * Get all retailer mappings for a product
   */
  async getRetailerMappingsForProduct(productId: string) {
    return this.listRetailerMappings({
      product_id: productId,
      is_active: true,
    })
  }

  /**
   * Get current pricing from all retailers for a product
   */
  async getCurrentPricingForProduct(productId: string) {
    const allPricing = await this.listRetailerPricings({
      product_id: productId,
    })
    
    // Filter for current prices (effective_to is null or in the future)
    const now = new Date()
    return allPricing.filter((p: any) => {
      return !p.effective_to || new Date(p.effective_to) > now
    })
  }

  /**
   * Get best price across retailers for a product
   */
  async getBestPriceForProduct(productId: string) {
    const prices = await this.getCurrentPricingForProduct(productId)
    if (prices.length === 0) return null

    return prices.reduce((best, current) => {
      const currentPrice = current.sale_price || current.list_price
      const bestPrice = best.sale_price || best.list_price
      return currentPrice < bestPrice ? current : best
    })
  }

  /**
   * Get all products available at a specific retailer
   */
  async getProductsForRetailer(storeName: string, options?: {
    limit?: number
    offset?: number
    stockStatus?: string
  }) {
    return this.listRetailerMappings({
      store_name: storeName,
      is_active: true,
      ...(options?.stockStatus && { stock_status: options.stockStatus }),
    }, {
      take: options?.limit || 100,
      skip: options?.offset || 0,
    })
  }
}

export default GoodsRetailerModuleService

