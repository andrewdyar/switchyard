import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntities,
  refetchEntity,
} from "@switchyard/framework/http"
import { createPricePreferencesWorkflow } from "@switchyard/core-flows"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminPricePreferenceListParams>,
  res: SwitchyardResponse<HttpTypes.AdminPricePreferenceListResponse>
) => {
  const { data: price_preferences, metadata } = await refetchEntities({
    entity: "price_preference",
    idOrFilter: req.filterableFields,
    scope: req.scope,
    fields: req.queryConfig.fields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    price_preferences: price_preferences,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreatePricePreference,
    HttpTypes.AdminPricePreferenceParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminPricePreferenceResponse>
) => {
  const workflow = createPricePreferencesWorkflow(req.scope)
  const { result } = await workflow.run({
    input: [req.validatedBody],
  })

  const price_preference = await refetchEntity({
    entity: "price_preference",
    idOrFilter: result[0].id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ price_preference })
}
