import {
  addDraftOrderPromotionWorkflow,
  removeDraftOrderPromotionsWorkflow,
} from "@switchyard/core-flows"
import { AuthenticatedSwitchyardRequest, SwitchyardResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/types"
import {
  AdminAddDraftOrderPromotionsType,
  AdminRemoveDraftOrderPromotionsType,
} from "../../../validators"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminAddDraftOrderPromotionsType>,
  res: SwitchyardResponse<HttpTypes.AdminDraftOrderPreviewResponse>
) => {
  const { id } = req.params

  const { result } = await addDraftOrderPromotionWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      order_id: id,
    },
  })

  res.json({
    draft_order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest<AdminRemoveDraftOrderPromotionsType>,
  res: SwitchyardResponse<HttpTypes.AdminDraftOrderPreviewResponse>
) => {
  const { id } = req.params

  const { result } = await removeDraftOrderPromotionsWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      order_id: id,
    },
  })

  res.json({
    draft_order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}
