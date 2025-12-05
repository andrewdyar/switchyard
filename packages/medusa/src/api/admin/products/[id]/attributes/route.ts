/**
 * API Route: Get/Update Product Attributes
 * 
 * GET /admin/products/:id/attributes - Get product attributes
 * POST /admin/products/:id/attributes - Update product attributes
 * 
 * This route fetches custom Goods attributes for a product.
 * If no custom attributes exist, it falls back to reading from product.metadata.
 */

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { GOODS_ATTRIBUTES_MODULE } from "../../../../../modules/goods-attributes"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // First, get the product with its metadata
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "metadata"],
      filters: { id },
    })

    if (products.length === 0) {
      res.json({ attributes: null, metadata: null })
      return
    }

    const product = products[0]
    const metadata = product.metadata || {}

    // Try to get linked attributes
    let linkedAttributes = null
    try {
      const { data: productsWithAttrs } = await query.graph({
        entity: "product",
        fields: ["id", "goodsProductAttributes.*"],
        filters: { id },
      })
      
      if (productsWithAttrs.length > 0) {
        const p = productsWithAttrs[0]
        linkedAttributes = p.goodsProductAttributes?.[0] || p.goodsProductAttributes || null
      }
    } catch (linkError) {
      // Link query failed - this is expected if no attributes are linked yet
      console.log("No linked attributes found for product:", id)
    }

    // Merge: linked attributes take precedence, then fall back to metadata
    const attributes = {
      id: linkedAttributes?.id || null,
      brand: linkedAttributes?.brand ?? metadata.brand ?? null,
      unit_of_measure: linkedAttributes?.unit_of_measure ?? "each",
      priced_by_weight: linkedAttributes?.priced_by_weight ?? false,
      is_organic: linkedAttributes?.is_organic ?? metadata.is_organic ?? false,
      is_gluten_free: linkedAttributes?.is_gluten_free ?? metadata.is_gluten_free ?? false,
      is_vegan: linkedAttributes?.is_vegan ?? metadata.is_vegan ?? false,
      is_non_gmo: linkedAttributes?.is_non_gmo ?? metadata.is_non_gmo ?? false,
      is_new: linkedAttributes?.is_new ?? false,
      on_ad: linkedAttributes?.on_ad ?? false,
      best_available: linkedAttributes?.best_available ?? false,
      show_coupon_flag: linkedAttributes?.show_coupon_flag ?? false,
      in_assortment: linkedAttributes?.in_assortment ?? true,
      full_category_hierarchy: linkedAttributes?.full_category_hierarchy ?? metadata.category ?? null,
      product_page_url: linkedAttributes?.product_page_url ?? metadata.product_page_url ?? null,
      inventory_type: linkedAttributes?.inventory_type ?? null,
      warehouse_aisle: linkedAttributes?.warehouse_aisle ?? null,
      warehouse_shelf_group: linkedAttributes?.warehouse_shelf_group ?? null,
      warehouse_shelf: linkedAttributes?.warehouse_shelf ?? null,
      // Include extra metadata fields
      upc: metadata.upc ?? null,
      goods_id: metadata.goods_id ?? null,
    }

    res.json({ attributes, metadata, hasLinkedAttributes: !!linkedAttributes?.id })
  } catch (error) {
    console.error("Error fetching product attributes:", error)
    res.status(500).json({ 
      message: "Failed to fetch product attributes",
      error: (error as Error).message 
    })
  }
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const goodsAttributesService = req.scope.resolve(GOODS_ATTRIBUTES_MODULE)
  const link = req.scope.resolve(Modules.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const updateData = req.body as Record<string, any>

    // Validate inventory_type
    if (updateData.inventory_type && !["Warehouse", "Sweep"].includes(updateData.inventory_type)) {
      res.status(400).json({ 
        message: "Invalid inventory_type. Must be 'Warehouse' or 'Sweep'"
      })
      return
    }

    // Clear warehouse location fields if switching to Sweep
    if (updateData.inventory_type === "Sweep") {
      updateData.warehouse_aisle = null
      updateData.warehouse_shelf_group = null
      updateData.warehouse_shelf = null
    }

    // Check if the product exists
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { id },
    })

    if (products.length === 0) {
      res.status(404).json({ message: "Product not found" })
      return
    }

    // Check if attributes already exist
    let existingAttributes = null
    try {
      const { data: productsWithAttrs } = await query.graph({
        entity: "product",
        fields: ["id", "goodsProductAttributes.id"],
        filters: { id },
      })
      
      if (productsWithAttrs.length > 0) {
        const p = productsWithAttrs[0]
        existingAttributes = p.goodsProductAttributes?.[0] || p.goodsProductAttributes
      }
    } catch (e) {
      // No linked attributes yet
    }

    let attributes

    if (existingAttributes?.id) {
      // Update existing attributes
      attributes = await goodsAttributesService.updateProductAttributes(
        existingAttributes.id,
        updateData
      )
    } else {
      // Create new attributes
      attributes = await goodsAttributesService.createProductAttributes(updateData)
      
      // Link to product
      await link.create({
        [Modules.PRODUCT]: { product_id: id },
        [GOODS_ATTRIBUTES_MODULE]: { goods_product_attributes_id: attributes.id },
      })
    }

    res.json({ attributes })
  } catch (error) {
    console.error("Error updating product attributes:", error)
    res.status(500).json({ 
      message: "Failed to update product attributes",
      error: (error as Error).message 
    })
  }
}
