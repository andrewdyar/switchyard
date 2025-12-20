import type {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { Modules } from "@switchyard/framework/utils"

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
  req: AuthenticatedSwitchyardRequest<ScanInventoryBody>,
  res: SwitchyardResponse
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
      $or: [
        { variants: { sku: barcode } },
        { variants: { barcode: barcode } },
      ],
    } as any)

    const productsArray = products as unknown as any[]
    if (!productsArray || productsArray.length === 0) {
      res.status(404).json({
        error: "Product not found",
        barcode,
        scanned_at: new Date().toISOString(),
      })
      return
    }

    const product = productsArray[0]

    // Get inventory information if location provided
    let inventoryInfo: any = null
    if (location_id) {
      const [inventoryItems] = await inventoryModuleService.listInventoryItems({
        sku: barcode,
      } as any)

      const itemsArray = inventoryItems as unknown as any[]
      if (itemsArray && itemsArray.length > 0) {
        const inventoryItem = itemsArray[0]
        const [inventoryLevels] = await inventoryModuleService.listInventoryLevels({
          inventory_item_id: inventoryItem.id,
          location_id: location_id,
        })

        const levelsArray = Array.isArray(inventoryLevels) ? inventoryLevels : []
        if (levelsArray.length > 0) {
          inventoryInfo = levelsArray[0]
        }
      }
    }

    // Handle different actions
    if (action === "adjust" && quantity !== undefined && inventoryInfo) {
      // Adjust inventory level - need inventory_item_id and location_id for updateInventoryLevels
      await inventoryModuleService.updateInventoryLevels([
        {
          inventory_item_id: inventoryInfo.inventory_item_id,
          location_id: inventoryInfo.location_id,
          stocked_quantity: inventoryInfo.stocked_quantity + quantity,
        },
      ] as any)

      // Refresh inventory info
      const [updatedLevels] = await inventoryModuleService.listInventoryLevels({
        id: inventoryInfo.id,
      } as any)
      const updatedArray = Array.isArray(updatedLevels) ? updatedLevels : []
      inventoryInfo = updatedArray[0] || inventoryInfo
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
