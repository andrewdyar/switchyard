import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

/**
 * GET /scanner/orders/:id
 * Get order details for picking/delivery
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params

  try {
    const orderModuleService = req.scope.resolve(Modules.ORDER)

    const order = await orderModuleService.retrieveOrder(id, {
      relations: ["items", "shipping_address", "billing_address", "fulfillments"],
    })

    res.json({
      order: {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        fulfillment_status: order.fulfillment_status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        items: order.items?.map((item: any) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          thumbnail: item.thumbnail,
          variant_sku: item.variant_sku,
        })),
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        fulfillments: order.fulfillments?.map((f: any) => ({
          id: f.id,
          status: f.status,
          shipped_at: f.shipped_at,
          delivered_at: f.delivered_at,
        })),
      },
    })
  } catch (error: any) {
    console.error("Order detail error:", error)
    res.status(500).json({
      error: "Failed to get order",
      message: error.message,
    })
  }
}
