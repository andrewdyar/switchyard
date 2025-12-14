import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { Modules } from "@switchyard/framework/utils"

interface CreateTestOrderBody {
  customer_id?: string
  items: Array<{
    variant_id: string
    quantity: number
  }>
  shipping_address?: {
    first_name: string
    last_name: string
    address_1: string
    city: string
    postal_code: string
    country_code?: string
    phone?: string
  }
  notes?: string
}

/**
 * POST /admin/test-orders
 * Create a test order for verification purposes
 * 
 * This endpoint allows admins to create orders directly without going through
 * the mobile app, useful for testing the fulfillment flow.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<CreateTestOrderBody>,
  res: MedusaResponse
) => {
  const { customer_id, items, shipping_address, notes } = req.body

  if (!items || items.length === 0) {
    res.status(400).json({ error: "At least one item is required" })
    return
  }

  try {
    const orderModuleService = req.scope.resolve(Modules.ORDER)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const regionModuleService = req.scope.resolve(Modules.REGION)

    // Get default region (or first available)
    const [regions] = await regionModuleService.listRegions({}, { take: 1 })
    const regionsArray = regions as unknown as any[]
    if (!regionsArray || regionsArray.length === 0) {
      res.status(400).json({ error: "No regions configured" })
      return
    }
    const region = regionsArray[0]

    // Get or create a test customer
    let customer: any = null
    if (customer_id) {
      customer = await customerModuleService.retrieveCustomer(customer_id)
    } else {
      // Look for existing test customer
      const [customers] = await customerModuleService.listCustomers({
        email: "test@switchyard.run",
      })
      const customersArray = customers as unknown as any[]
      if (customersArray && customersArray.length > 0) {
        customer = customersArray[0]
      } else {
        // Create test customer
        customer = await customerModuleService.createCustomers({
          email: "test@switchyard.run",
          first_name: "Test",
          last_name: "Customer",
        })
      }
    }

    // Build line items with product details
    const lineItems: any[] = []
    for (const item of items) {
      const variant = await productModuleService.retrieveProductVariant(
        item.variant_id,
        { relations: ["product"] }
      )

      lineItems.push({
        title: (variant as any).product?.title || variant.title || "Product",
        variant_id: variant.id,
        variant_sku: variant.sku,
        variant_title: variant.title,
        quantity: item.quantity,
        unit_price: 0, // Test orders have no price
        requires_shipping: true,
      })
    }

    // Create the order
    const order = await orderModuleService.createOrders({
      region_id: region.id,
      customer_id: customer.id,
      email: customer.email,
      currency_code: region.currency_code || "usd",
      items: lineItems,
      shipping_address: shipping_address || {
        first_name: "Test",
        last_name: "Customer",
        address_1: "123 Test Street",
        city: "Austin",
        postal_code: "78701",
        country_code: "us",
      },
      metadata: {
        is_test_order: true,
        created_by: req.auth_context?.actor_id,
        notes: notes || "Test order created from admin",
      },
    })

    res.status(201).json({
      success: true,
      message: "Test order created successfully",
      order: {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        customer_id: order.customer_id,
        items: order.items?.map((item: any) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          variant_sku: item.variant_sku,
        })),
        created_at: order.created_at,
      },
    })
  } catch (error: any) {
    console.error("Create test order error:", error)
    res.status(500).json({
      error: "Failed to create test order",
      message: error.message,
    })
  }
}

/**
 * GET /admin/test-orders
 * List test orders
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const limit = parseInt(req.query.limit as string) || 20
  const offset = parseInt(req.query.offset as string) || 0

  try {
    const orderModuleService = req.scope.resolve(Modules.ORDER)

    // Filter for test orders using metadata
    const [orders, count] = await orderModuleService.listAndCountOrders(
      {
        metadata: {
          is_test_order: true,
        },
      } as any,
      {
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
      }
    )

    res.json({
      orders: orders.map((order: any) => ({
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        customer_id: order.customer_id,
        created_at: order.created_at,
        notes: order.metadata?.notes,
      })),
      count,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("List test orders error:", error)
    res.status(500).json({
      error: "Failed to list test orders",
      message: error.message,
    })
  }
}
