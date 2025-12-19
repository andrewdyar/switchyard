import type {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import {
  lookupProductByBarcode,
  getInventoryForProduct,
} from "../../../../lib/supabase"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

/**
 * GET /scanner/inventory/lookup?barcode=xxx
 * Look up product and inventory by barcode using Supabase tables
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
    // Look up sellable product by barcode
    const sellableProduct = await lookupProductByBarcode(barcode)

    if (!sellableProduct) {
      res.status(404).json({
        error: "Product not found",
        barcode,
      })
      return
    }

    // Get inventory items for this product using FEFO/FIFO
    const inventoryItems = await getInventoryForProduct(
      sellableProduct.id,
      locationId
    )

    // Calculate totals
    const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalReserved = inventoryItems.reduce((sum, item) => sum + item.reserved_quantity, 0)

    res.json({
      success: true,
      barcode,
      product: {
        id: sellableProduct.id,
        name: sellableProduct.name,
        brand: sellableProduct.brand,
        image_url: sellableProduct.image_url,
        description: sellableProduct.description,
        selling_price: sellableProduct.selling_price,
        is_perishable: sellableProduct.is_perishable,
        warehouse_zone: sellableProduct.warehouse_zone,
      },
      inventory: {
        total_quantity: totalQuantity,
        total_reserved: totalReserved,
        available_quantity: totalQuantity - totalReserved,
        items: inventoryItems.map((item) => ({
          id: item.id,
          location_id: item.location_id,
          quantity: item.quantity,
          reserved_quantity: item.reserved_quantity,
          available: item.quantity - item.reserved_quantity,
          expiration_date: item.expiration_date,
          received_at: item.received_at,
          lot_number: item.lot_number,
        })),
      },
    })
  } catch (error: any) {
    console.error("Inventory lookup error:", error)
    res.status(500).json({
      error: "Failed to lookup product",
      message: error.message,
    })
  }
}
