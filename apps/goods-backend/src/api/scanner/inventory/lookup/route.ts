import type {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { Modules } from "@switchyard/framework/utils"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

/**
 * GET /scanner/inventory/lookup?barcode=xxx
 * Look up product and inventory by barcode
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const barcode = req.query.barcode as string
  const locationId = req.query.location_id as string | undefined

  if (!barcode) {
    res.status(400).json({ error: "Barcode query parameter is required" })
    return
  }

  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const inventoryModuleService = req.scope.resolve(Modules.INVENTORY)

    // Look up product variants by SKU or barcode
    const [variants] = await productModuleService.listProductVariants({
      $or: [{ sku: barcode }, { barcode: barcode }],
    } as any)

    const variantsArray = variants as unknown as any[]
    if (!variantsArray || variantsArray.length === 0) {
      res.status(404).json({
        error: "Product not found",
        barcode,
      })
      return
    }

    const variant = variantsArray[0]

    // Get the product
    const productId = variant.product_id
    if (!productId) {
      res.status(404).json({ error: "Product not linked to variant", barcode })
      return
    }
    const product = await productModuleService.retrieveProduct(productId)

    // Get inventory items for this variant
    const variantSku = variant.sku
    let inventoryLevels: any[] = []
    
    if (variantSku) {
      const [inventoryItems] = await inventoryModuleService.listInventoryItems({
        sku: variantSku,
      })

      const itemsArray = inventoryItems as unknown as any[]
      if (itemsArray && itemsArray.length > 0) {
        const inventoryItem = itemsArray[0]
        
        const filter: any = {
          inventory_item_id: inventoryItem.id,
        }
        
        if (locationId) {
          filter.location_id = locationId
        }

        const [levels] = await inventoryModuleService.listInventoryLevels(filter)
        inventoryLevels = Array.isArray(levels) ? levels : []
      }
    }

    res.json({
      success: true,
      barcode,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
        description: product.description,
      },
      variant: {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
      },
      inventory: inventoryLevels.map((level: any) => ({
        location_id: level.location_id,
        stocked_quantity: level.stocked_quantity,
        reserved_quantity: level.reserved_quantity,
        available_quantity: level.stocked_quantity - level.reserved_quantity,
      })),
    })
  } catch (error: any) {
    console.error("Inventory lookup error:", error)
    res.status(500).json({
      error: "Failed to lookup product",
      message: error.message,
    })
  }
}

