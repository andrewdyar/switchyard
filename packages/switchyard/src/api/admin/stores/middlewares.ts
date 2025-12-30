import { MiddlewareRoute } from "@switchyard/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@switchyard/framework"
import * as QueryConfig from "./query-config"
import {
  AdminGetStoreParams,
  AdminGetStoresParams,
  AdminUpdateStore,
} from "./validators"
import { isStoreModuleEnabled } from "../../../utils/middlewares/disabled-module-middleware"

export const adminStoreRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/stores",
    middlewares: [
      isStoreModuleEnabled,
      validateAndTransformQuery(
        AdminGetStoresParams,
        QueryConfig.listTransformQueryConfig
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/stores/:id",
    middlewares: [
      isStoreModuleEnabled,
      validateAndTransformQuery(
        AdminGetStoreParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/stores/:id",
    middlewares: [
      isStoreModuleEnabled,
      validateAndTransformBody(AdminUpdateStore),
      validateAndTransformQuery(
        AdminGetStoreParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
