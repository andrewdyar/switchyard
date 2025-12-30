/**
 * VariantGroupModuleService - Manages variant groups
 * 
 * Provides CRUD operations for variant groups and their members.
 */

import { SwitchyardService } from "@switchyard/framework/utils"
import { VariantGroup, VariantGroupMember } from "../models"

class VariantGroupModuleService extends SwitchyardService({
  VariantGroup,
  VariantGroupMember,
}) {
  // The base SwitchyardService automatically provides CRUD operations:
  // - createVariantGroups / createVariantGroupMembers
  // - retrieveVariantGroup / retrieveVariantGroupMember
  // - listVariantGroups / listVariantGroupMembers
  // - updateVariantGroups / updateVariantGroupMembers
  // - deleteVariantGroups / deleteVariantGroupMembers

  /**
   * Get all variant groups that a product belongs to
   */
  async getProductVariantGroups(sellableProductId: string): Promise<any[]> {
    const members = await (this as any).listVariantGroupMembers(
      { sellable_product_id: sellableProductId },
      { relations: ["variant_group"] }
    )
    return members.map((m: any) => m.variant_group).filter(Boolean)
  }

  /**
   * Get all products in a variant group
   */
  async getVariantGroupProducts(variantGroupId: string): Promise<any[]> {
    const members = await (this as any).listVariantGroupMembers(
      { variant_group_id: variantGroupId },
      { order: { display_order: "ASC" } }
    )
    return members
  }

  /**
   * Get related products (all products in the same variant groups)
   */
  async getRelatedProducts(sellableProductId: string): Promise<string[]> {
    // Get all variant groups this product belongs to
    const groups = await this.getProductVariantGroups(sellableProductId)
    
    if (!groups.length) {
      return []
    }

    // Get all members of those groups
    const groupIds = groups.map((g: any) => g.id)
    const members = await (this as any).listVariantGroupMembers(
      { variant_group_id: groupIds },
      { order: { display_order: "ASC" } }
    )

    // Filter out the original product and return unique product IDs
    const relatedProductIds = Array.from(new Set(
      members
        .filter((m: any) => m.sellable_product_id !== sellableProductId)
        .map((m: any) => m.sellable_product_id)
    ))

    return relatedProductIds as string[]
  }

  /**
   * Add a product to a variant group
   */
  async addProductToGroup(
    variantGroupId: string,
    sellableProductId: string,
    options?: {
      is_default?: boolean
      display_order?: number
      variant_label?: string
    }
  ): Promise<any> {
    return (this as any).createVariantGroupMembers({
      variant_group_id: variantGroupId,
      sellable_product_id: sellableProductId,
      is_default: options?.is_default ?? false,
      display_order: options?.display_order ?? 0,
      variant_label: options?.variant_label ?? null,
    })
  }

  /**
   * Remove a product from a variant group
   */
  async removeProductFromGroup(
    variantGroupId: string,
    sellableProductId: string
  ): Promise<void> {
    const members = await (this as any).listVariantGroupMembers({
      variant_group_id: variantGroupId,
      sellable_product_id: sellableProductId,
    })

    if (members.length) {
      await (this as any).deleteVariantGroupMembers(members.map((m: any) => m.id))
    }
  }
}

export default VariantGroupModuleService
