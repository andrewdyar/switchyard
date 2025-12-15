import { defineMiddlewares, authenticate } from "@switchyard/framework/http"
import { authorize } from "../middlewares/authorize-middleware"

/**
 * Custom middlewares for the Goods Backend.
 * 
 * This applies explicit authentication to admin routes to fix race conditions
 * that cause random 401 errors when using global router.use() authentication.
 * 
 * The pattern: AUTHENTICATE=false on route files + explicit middleware here
 */
export default defineMiddlewares({
  routes: [
    // =====================================================
    // ADMIN ROUTES - Explicit Authentication
    // =====================================================
    
    // Customers - Priority 1
    {
      method: ["GET", "POST"],
      matcher: "/admin/customers",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/customers/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/customers/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Orders - Priority 2
    {
      method: ["GET", "POST"],
      matcher: "/admin/orders",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/orders/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/orders/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Products - Priority 3
    {
      method: ["GET", "POST"],
      matcher: "/admin/products",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/products/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/products/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Inventory Groups - Priority 4
    {
      method: ["GET", "POST"],
      matcher: "/admin/inventory-groups",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/inventory-groups/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/inventory-groups/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Inventory Items
    {
      method: ["GET", "POST"],
      matcher: "/admin/inventory-items",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/inventory-items/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/inventory-items/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Stores - Priority 5
    {
      method: ["GET", "POST"],
      matcher: "/admin/stores",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/stores/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Notifications - Priority 6
    {
      method: ["GET", "POST"],
      matcher: "/admin/notifications",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST"],
      matcher: "/admin/notifications/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Users
    {
      method: ["GET", "POST"],
      matcher: "/admin/users",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/users/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Stock Locations
    {
      method: ["GET", "POST"],
      matcher: "/admin/stock-locations",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/stock-locations/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/stock-locations/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Reservations
    {
      method: ["GET", "POST"],
      matcher: "/admin/reservations",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/reservations/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Collections
    {
      method: ["GET", "POST"],
      matcher: "/admin/collections",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/collections/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/collections/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Product Categories
    {
      method: ["GET", "POST"],
      matcher: "/admin/product-categories",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/product-categories/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/product-categories/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Sales Channels
    {
      method: ["GET", "POST"],
      matcher: "/admin/sales-channels",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/sales-channels/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/sales-channels/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Regions
    {
      method: ["GET", "POST"],
      matcher: "/admin/regions",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/regions/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/regions/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Currencies
    {
      method: ["GET"],
      matcher: "/admin/currencies",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST"],
      matcher: "/admin/currencies/:code",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Tax Rates
    {
      method: ["GET", "POST"],
      matcher: "/admin/tax-rates",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/tax-rates/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Tax Regions
    {
      method: ["GET", "POST"],
      matcher: "/admin/tax-regions",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/tax-regions/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Shipping Options
    {
      method: ["GET", "POST"],
      matcher: "/admin/shipping-options",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/shipping-options/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Shipping Profiles
    {
      method: ["GET", "POST"],
      matcher: "/admin/shipping-profiles",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/shipping-profiles/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Fulfillments
    {
      method: ["GET", "POST"],
      matcher: "/admin/fulfillments",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/fulfillments/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/fulfillments/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Fulfillment Sets
    {
      method: ["GET", "POST"],
      matcher: "/admin/fulfillment-sets",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/fulfillment-sets/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Fulfillment Providers
    {
      method: ["GET"],
      matcher: "/admin/fulfillment-providers",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Invites
    {
      method: ["GET", "POST"],
      matcher: "/admin/invites",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/invites/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // API Keys
    {
      method: ["GET", "POST"],
      matcher: "/admin/api-keys",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/api-keys/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/api-keys/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Payments
    {
      method: ["GET", "POST"],
      matcher: "/admin/payments",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST"],
      matcher: "/admin/payments/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST"],
      matcher: "/admin/payments/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Payment Collections
    {
      method: ["GET", "POST"],
      matcher: "/admin/payment-collections",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/payment-collections/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/payment-collections/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Promotions
    {
      method: ["GET", "POST"],
      matcher: "/admin/promotions",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/promotions/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/promotions/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Campaigns
    {
      method: ["GET", "POST"],
      matcher: "/admin/campaigns",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/campaigns/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Price Lists
    {
      method: ["GET", "POST"],
      matcher: "/admin/price-lists",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/price-lists/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/price-lists/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Uploads
    {
      method: ["POST", "DELETE"],
      matcher: "/admin/uploads",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Workflows Executions
    {
      method: ["GET", "POST"],
      matcher: "/admin/workflows-executions",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST"],
      matcher: "/admin/workflows-executions/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST"],
      matcher: "/admin/workflows-executions/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Returns
    {
      method: ["GET", "POST"],
      matcher: "/admin/returns",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/returns/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/returns/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Claims
    {
      method: ["GET", "POST"],
      matcher: "/admin/claims",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/claims/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/claims/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Exchanges
    {
      method: ["GET", "POST"],
      matcher: "/admin/exchanges",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/exchanges/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/exchanges/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Draft Orders
    {
      method: ["GET", "POST"],
      matcher: "/admin/draft-orders",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/draft-orders/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/draft-orders/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Customer Groups
    {
      method: ["GET", "POST"],
      matcher: "/admin/customer-groups",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/customer-groups/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/customer-groups/:id/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Product Tags
    {
      method: ["GET", "POST"],
      matcher: "/admin/product-tags",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/product-tags/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Product Types
    {
      method: ["GET", "POST"],
      matcher: "/admin/product-types",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/product-types/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Product Variants
    {
      method: ["GET"],
      matcher: "/admin/product-variants",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Return Reasons
    {
      method: ["GET", "POST"],
      matcher: "/admin/return-reasons",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/return-reasons/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // Refund Reasons
    {
      method: ["GET", "POST"],
      matcher: "/admin/refund-reasons",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      method: ["GET", "POST", "DELETE"],
      matcher: "/admin/refund-reasons/:id",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // =====================================================
    // Catch-all for remaining admin routes
    // =====================================================
    {
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      matcher: "/admin/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },

    // =====================================================
    // SCANNER API ROUTES - For Drivers/Pickers
    // =====================================================
    
    // Scanner status endpoint
    {
      method: ["GET"],
      matcher: "/scanner",
      middlewares: [
        authenticate("user", ["bearer"]),
        authorize(["scanner.use", "inventory.scan"]),
      ],
    },

    // Inventory scanning endpoints
    {
      method: ["POST"],
      matcher: "/scanner/inventory/scan",
      middlewares: [
        authenticate("user", ["bearer"]),
        authorize(["inventory.scan", "inventory.write"]),
      ],
    },
    {
      method: ["GET"],
      matcher: "/scanner/inventory/lookup",
      middlewares: [
        authenticate("user", ["bearer"]),
        authorize(["inventory.read", "inventory.scan"]),
      ],
    },

    // Order endpoints for pickers/drivers
    {
      method: ["GET"],
      matcher: "/scanner/orders",
      middlewares: [
        authenticate("user", ["bearer"]),
        authorize(["orders.read", "scanner.use"]),
      ],
    },
    {
      method: ["GET"],
      matcher: "/scanner/orders/:id",
      middlewares: [
        authenticate("user", ["bearer"]),
        authorize(["orders.read", "scanner.use"]),
      ],
    },
  ],
})


