import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework/http"
import {
  AdminCreateInventoryGroup,
  AdminGetInventoryGroupsParams,
  AdminUpdateInventoryGroup,
  AdminUpdateInventoryGroupProducts,
} from "./validators"
import {
  listInventoryGroupConfig,
  retrieveInventoryGroupConfig,
} from "./query-config"

export const adminInventoryGroupsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/inventory-groups",
    middlewares: [
      validateAndTransformQuery(
        AdminGetInventoryGroupsParams,
        listInventoryGroupConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/inventory-groups",
    middlewares: [validateAndTransformBody(AdminCreateInventoryGroup)],
  },
  {
    method: ["GET"],
    matcher: "/admin/inventory-groups/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetInventoryGroupsParams,
        retrieveInventoryGroupConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/inventory-groups/:id",
    middlewares: [validateAndTransformBody(AdminUpdateInventoryGroup)],
  },
  {
    method: ["POST"],
    matcher: "/admin/inventory-groups/:id/products",
    middlewares: [validateAndTransformBody(AdminUpdateInventoryGroupProducts)],
  },
]

