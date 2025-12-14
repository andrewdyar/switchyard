import { orderEditAddNewItemWorkflow } from "@switchyard/core-flows"

import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { AdminPostOrderEditsAddItemsReqSchemaType } from "../../validators"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPostOrderEditsAddItemsReqSchemaType>,
  res: SwitchyardResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params

  const { result } = await orderEditAddNewItemWorkflow(req.scope).run({
    input: { ...req.validatedBody, order_id: id },
  })

  res.json({
    order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}
