import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

interface ScanInventoryBody {
  barcode: string
  location_id?: string
  quantity?: number
  action?: "lookup" | "adjust" | "count"
}

/**
 * POST /scanner/inventory/scan
 * Process an inventory scan from a mobile device
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<ScanInventoryBody>,
  res: MedusaResponse
) => {
  const { barcode, location_id, quantity, action = "lookup" } = req.body

  if (!barcode) {
    res.status(400).json({ error: "Barcode is required" })
    return
  }

  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const inventoryModuleService = req.scope.resolve(Modules.INVENTORY)

    // Look up product by barcode (SKU or barcode field)
    const [products] = await productModuleService.listProducts({
      // @ts-ignore - barcode may be stored in different fields
      $or: [
        { variants: { sku: barcode } },
        { variants: { barcode: barcode } },
      ],
    })

    if (!products || products.length === 0) {
      res.status(404).json({
        error: "Product not found",
        barcode,
        scanned_at: new Date().toISOString(),
      })
      return
    }

    const product = products

    // Get inventory information if location provided
    let inventoryInfo = null
    if (location_id) {
      const [inventoryItems] = await inventoryModuleService.listInventoryItems({
        // @ts-ignore
        sku: barcode,
      })

      if (inventoryItems && inventoryItems.length > 0) {
        const inventoryItem = inventoryItems[0]
        const [inventoryLevels] = await inventoryModuleService.listInventoryLevels({
          inventory_item_id: inventoryItem.id,
          location_id: location_id,
        })

        if (inventoryLevels && inventoryLevels.length > 0) {
          inventoryInfo = inventoryLevels[0]
        }
      }
    }

    // Handle different actions
    if (action === "adjust" && quantity !== undefined && inventoryInfo) {
      // Adjust inventory level
      await inventoryModuleService.updateInventoryLevels([
        {
          id: inventoryInfo.id,
          stocked_quantity: inventoryInfo.stocked_quantity + quantity,
        },
      ])

      // Refresh inventory info
      const [updatedLevels] = await inventoryModuleService.listInventoryLevels({
        id: inventoryInfo.id,
      })
      inventoryInfo = updatedLevels?.[0] || inventoryInfo
    }

    res.json({
      success: true,
      barcode,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
      },
      inventory: inventoryInfo
        ? {
            stocked_quantity: inventoryInfo.stocked_quantity,
            reserved_quantity: inventoryInfo.reserved_quantity,
            available_quantity:
              inventoryInfo.stocked_quantity - inventoryInfo.reserved_quantity,
            location_id: inventoryInfo.location_id,
          }
        : null,
      scanned_at: new Date().toISOString(),
      scanned_by: req.auth_context?.actor_id,
    })
  } catch (error: any) {
    console.error("Inventory scan error:", error)
    res.status(500).json({
      error: "Failed to process scan",
      message: error.message,
    })
  }
}
