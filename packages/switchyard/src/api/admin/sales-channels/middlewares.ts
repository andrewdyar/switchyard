import { maybeApplyLinkFilter, MiddlewareRoute } from "@switchyard/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@switchyard/framework"
import { createLinkBody } from "../../utils/validators"
import * as QueryConfig from "./query-config"
import {
  AdminCreateSalesChannel,
  AdminGetSalesChannelParams,
  AdminGetSalesChannelsParams,
  AdminUpdateSalesChannel,
} from "./validators"
import { isSalesChannelModuleEnabled } from "../../../utils/middlewares/disabled-module-middleware"

export const adminSalesChannelRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/sales-channels",
    middlewares: [
      isSalesChannelModuleEnabled,
      validateAndTransformQuery(
        AdminGetSalesChannelsParams,
        QueryConfig.listTransformQueryConfig
      ),
      maybeApplyLinkFilter({
        entryPoint: "sales_channel_location",
        resourceId: "sales_channel_id",
        filterableField: "location_id",
      }),
      maybeApplyLinkFilter({
        entryPoint: "publishable_api_key_sales_channel",
        resourceId: "sales_channel_id",
        filterableField: "publishable_key_id",
      }),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/sales-channels/:id",
    middlewares: [
      isSalesChannelModuleEnabled,
      validateAndTransformQuery(
        AdminGetSalesChannelParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/sales-channels",
    middlewares: [
      isSalesChannelModuleEnabled,
      validateAndTransformBody(AdminCreateSalesChannel),
      validateAndTransformQuery(
        AdminGetSalesChannelParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/sales-channels/:id",
    middlewares: [
      isSalesChannelModuleEnabled,
      validateAndTransformBody(AdminUpdateSalesChannel),
      validateAndTransformQuery(
        AdminGetSalesChannelParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/sales-channels/:id",
    middlewares: [isSalesChannelModuleEnabled],
  },
  {
    method: ["POST"],
    matcher: "/admin/sales-channels/:id/products",
    middlewares: [
      isSalesChannelModuleEnabled,
      validateAndTransformBody(createLinkBody()),
      validateAndTransformQuery(
        AdminGetSalesChannelParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
