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
import { isRegionModuleEnabled } from "../../../utils/middlewares/disabled-module-middleware"

export const adminRegionRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/regions",
    middlewares: [
      isRegionModuleEnabled,
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
      isRegionModuleEnabled,
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
      isRegionModuleEnabled,
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
      isRegionModuleEnabled,
      validateAndTransformBody(AdminUpdateRegion),
      validateAndTransformQuery(
        AdminGetRegionParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
