import * as QueryConfig from "./query-config"
import { MiddlewareRoute } from "@switchyard/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@switchyard/framework"
import {
  AdminCreateRegion,
  AdminGetRegionParams,
  AdminGetRegionsParams,
  AdminUpdateRegion,
} from "./validators"

export const adminRegionRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/regions",
    middlewares: [
      validateAndTransformQuery(
        AdminGetRegionsParams,
        QueryConfig.listTransformQueryConfig
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/regions/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetRegionParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/regions",
    middlewares: [
      validateAndTransformBody(AdminCreateRegion),
      validateAndTransformQuery(
        AdminGetRegionParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/regions/:id",
    middlewares: [
      validateAndTransformBody(AdminUpdateRegion),
      validateAndTransformQuery(
        AdminGetRegionParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
