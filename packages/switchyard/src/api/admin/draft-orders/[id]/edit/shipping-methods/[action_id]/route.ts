import {
  removeDraftOrderActionShippingMethodWorkflow,
  updateDraftOrderActionShippingMethodWorkflow,
} from "@switchyard/core-flows"
import { AuthenticatedSwitchyardRequest, SwitchyardResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/types"
import { AdminUpdateDraftOrderActionShippingMethodType } from "../../../../validators"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminUpdateDraftOrderActionShippingMethodType>,
  res: SwitchyardResponse
) => {
  const { id, action_id } = req.params

  const { result } = await updateDraftOrderActionShippingMethodWorkflow(
    req.scope
  ).run({
    input: {
      data: { ...req.validatedBody },
      order_id: id,
      action_id,
    },
  })

  res.json({
    draft_order_preview: result as unknown as HttpTypes.AdminDraftOrderPreview,
  })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id, action_id } = req.params

  const { result } = await removeDraftOrderActionShippingMethodWorkflow(
    req.scope
  ).run({
    input: {
      order_id: id,
      action_id,
    },
  })

  res.json({
    draft_order_preview: result as unknown as HttpTypes.AdminDraftOrderPreview,
  })
}
