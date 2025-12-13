import { batchProductVariantsWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchBatchVariants, remapVariantResponse } from "../../../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminBatchProductVariantRequest,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminBatchProductVariantResponse>
) => {
  const productId = req.params.id

  const normalizedInput = {
    create: req.validatedBody.create?.map((c) => ({
      ...c,
      product_id: productId,
    })),
    update: req.validatedBody.update?.map((u) => ({
      ...u,
      product_id: productId,
    })),
    delete: req.validatedBody.delete,
  }

  const { result } = await batchProductVariantsWorkflow(req.scope).run({
    input: normalizedInput,
  })

  const batchResults = await refetchBatchVariants(
    result,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({
    created: batchResults.created.map(remapVariantResponse),
    updated: batchResults.updated.map(remapVariantResponse),
    deleted: batchResults.deleted,
  })
}
