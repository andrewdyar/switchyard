import {
  removeDraftOrderActionItemWorkflow,
  updateDraftOrderActionItemWorkflow,
} from "@switchyard/core-flows"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/types"
import { AdminUpdateDraftOrderItemType } from "../../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateDraftOrderItemType>,
  res: MedusaResponse
) => {
  const { id, action_id } = req.params

  const { result } = await updateDraftOrderActionItemWorkflow(req.scope).run({
    input: {
      data: req.validatedBody,
      order_id: id,
      action_id,
    },
  })

  res.json({
    draft_order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id, action_id } = req.params

  const { result } = await removeDraftOrderActionItemWorkflow(req.scope).run({
    input: {
      order_id: id,
      action_id,
    },
  })

  res.json({
    draft_order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}
