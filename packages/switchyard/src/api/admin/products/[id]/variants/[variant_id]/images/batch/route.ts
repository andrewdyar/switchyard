import { batchVariantImagesWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"

/**
 * @since 2.11.2
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminBatchVariantImagesRequest>,
  res: SwitchyardResponse<HttpTypes.AdminBatchVariantImagesResponse>
) => {
  const variantId = req.params.variant_id

  const { result } = await batchVariantImagesWorkflow(req.scope).run({
    input: {
      variant_id: variantId,
      add: req.validatedBody.add,
      remove: req.validatedBody.remove,
    },
  })

  res.status(200).json({
    added: result.added,
    removed: result.removed,
  })
}
