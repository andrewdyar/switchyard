import type {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import {
  lookupProductByBarcode,
  getInventoryForProduct,
  adjustInventory,
  createInventoryItem,
} from "../../../../lib/supabase"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

interface ScanInventoryBody {
  barcode: string
  location_id?: string
  quantity?: number
  action?: "lookup" | "adjust" | "count" | "receive"
  expiration_date?: string
  lot_number?: string
}

/**
 * POST /scanner/inventory/scan
 * Process an inventory scan from a mobile device using Supabase tables
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest<ScanInventoryBody>,
  res: SwitchyardResponse
) => {
  const {
    barcode,
    location_id,
    quantity,
    action = "lookup",
    expiration_date,
    lot_number,
  } = req.body

  if (!barcode) {
    res.status(400).json({ error: "Barcode is required" })
    return
  }

  try {
    // Look up sellable product by barcode
    const sellableProduct = await lookupProductByBarcode(barcode)

    if (!sellableProduct) {
      res.status(404).json({
        error: "Product not found",
        barcode,
        scanned_at: new Date().toISOString(),
      })
      return
    }

    // Get inventory items for this product
    const inventoryItems = await getInventoryForProduct(
      sellableProduct.id,
      location_id
    )

    let inventoryInfo = inventoryItems.length > 0 ? inventoryItems[0] : null

    // Handle different actions
    if (action === "adjust" && quantity !== undefined && inventoryInfo) {
      // Adjust inventory level
      inventoryInfo = await adjustInventory(inventoryInfo.id, quantity)
    } else if (action === "receive" && quantity !== undefined && quantity > 0) {
      // Receive new inventory
      inventoryInfo = await createInventoryItem({
        sellable_product_id: sellableProduct.id,
        location_id: location_id,
        quantity: quantity,
        expiration_date: expiration_date,
        lot_number: lot_number,
      })
    } else if (action === "count" && quantity !== undefined && inventoryInfo) {
      // Count update - set quantity to exact count
      const adjustment = quantity - inventoryInfo.quantity
      inventoryInfo = await adjustInventory(inventoryInfo.id, adjustment)
    }

    // Calculate totals
    const allItems = await getInventoryForProduct(sellableProduct.id, location_id)
    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalReserved = allItems.reduce((sum, item) => sum + item.reserved_quantity, 0)

    res.json({
      success: true,
      barcode,
      action,
      product: {
        id: sellableProduct.id,
        name: sellableProduct.name,
        brand: sellableProduct.brand,
        image_url: sellableProduct.image_url,
        selling_price: sellableProduct.selling_price,
        is_perishable: sellableProduct.is_perishable,
      },
      inventory: inventoryInfo
        ? {
            item_id: inventoryInfo.id,
            quantity: inventoryInfo.quantity,
            reserved_quantity: inventoryInfo.reserved_quantity,
            available: inventoryInfo.quantity - inventoryInfo.reserved_quantity,
            location_id: inventoryInfo.location_id,
            expiration_date: inventoryInfo.expiration_date,
          }
        : null,
      totals: {
        total_quantity: totalQuantity,
        total_reserved: totalReserved,
        available: totalQuantity - totalReserved,
      },
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
