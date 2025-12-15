import type {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { Modules } from "@switchyard/framework/utils"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

/**
 * GET /scanner/orders
 * List orders for the current driver/picker
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const status = req.query.status as string | undefined
  const limit = parseInt(req.query.limit as string) || 20
  const offset = parseInt(req.query.offset as string) || 0

  try {
    const orderModuleService = req.scope.resolve(Modules.ORDER)

    const filter: any = {}
    
    if (status) {
      filter.status = status
    }

    const [orders, count] = await orderModuleService.listAndCountOrders(
      filter,
      {
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
        select: [
          "id",
          "display_id",
          "status",
          "fulfillment_status",
          "payment_status",
          "created_at",
          "total",
          "shipping_address",
        ],
      }
    )

    res.json({
      orders: orders.map((order: any) => ({
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        fulfillment_status: order.fulfillment_status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        total: order.total,
        shipping_address: order.shipping_address
          ? {
              first_name: order.shipping_address.first_name,
              last_name: order.shipping_address.last_name,
              address_1: order.shipping_address.address_1,
              city: order.shipping_address.city,
              postal_code: order.shipping_address.postal_code,
            }
          : null,
      })),
      count,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("Order list error:", error)
    res.status(500).json({
      error: "Failed to list orders",
      message: error.message,
    })
  }
}


