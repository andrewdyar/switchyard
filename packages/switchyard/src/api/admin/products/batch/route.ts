import { batchProductsWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchBatchProducts, remapProductResponse } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminBatchProductRequest,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminBatchProductResponse>
) => {
  const { result } = await batchProductsWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  const batchResults = await refetchBatchProducts(
    result,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({
    created: batchResults.created.map(remapProductResponse),
    updated: batchResults.updated.map(remapProductResponse),
    deleted: batchResults.deleted,
  })
}
