/**
 * Goods Source Module Service
 * 
 * Manages links between Medusa products and source catalog.
 */

import { MedusaService } from "@medusajs/framework/utils"
import { SourceProductLink } from "./models/source-link"

class GoodsSourceModuleService extends MedusaService({
  SourceProductLink,
}) {
  /**
   * Link a Medusa product to a source catalog item
   */
  async linkProductToSource(
    productId: string, 
    sourceProductId: string,
    sourceStoreName?: string
  ) {
    return this.createSourceProductLinks({
      source_product_id: sourceProductId,
      source_store_name: sourceStoreName,
    })
  }

  /**
   * Get source product info for a Medusa product
   */
  async getSourceForProduct(productId: string) {
    const links = await this.listSourceProductLinks({
      // Will be filtered by product_id through module link
    })
    return links[0] || null
  }

  /**
   * Check if a source product has already been added to commerce catalog
   */
  async isSourceProductLinked(sourceProductId: string) {
    const links = await this.listSourceProductLinks({
      source_product_id: sourceProductId,
    })
    return links.length > 0
  }
}

export default GoodsSourceModuleService

