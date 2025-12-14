import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { BatchMethodRequest, HttpTypes } from "@switchyard/framework/types"
import { refetchBatchRules } from "../../../helpers"
import { batchShippingOptionRulesWorkflow } from "@switchyard/core-flows"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    BatchMethodRequest<
      HttpTypes.AdminCreateShippingOptionRule,
      HttpTypes.AdminUpdateShippingOptionRule
    >,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminUpdateShippingOptionRulesResponse>
) => {
  const id = req.params.id
  const { result } = await batchShippingOptionRulesWorkflow(req.scope).run({
    input: {
      create: req.validatedBody.create?.map((c) => ({
        ...c,
        shipping_option_id: id,
      })),
      update: req.validatedBody.update,
      delete: req.validatedBody.delete,
    },
  })

  const batchResults = await refetchBatchRules(
    result,
    req.scope,
    req.queryConfig.fields
  )

  res
    .status(200)
    .json(
      batchResults as unknown as HttpTypes.AdminUpdateShippingOptionRulesResponse
    )
}
