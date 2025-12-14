import {
  AdminFulfillmentProviderOption,
  HttpTypes,
} from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminFulfillmentProviderOptionsListResponse>
) => {
  const fulfillmentProviderService = req.scope.resolve(Modules.FULFILLMENT)

  const fulfillmentOptions =
    await fulfillmentProviderService.retrieveFulfillmentOptions(req.params.id)

  res.json({
    fulfillment_options:
      fulfillmentOptions as unknown as AdminFulfillmentProviderOption[],
    count: fulfillmentOptions.length,
    limit: fulfillmentOptions.length,
    offset: 0,
  })
}
