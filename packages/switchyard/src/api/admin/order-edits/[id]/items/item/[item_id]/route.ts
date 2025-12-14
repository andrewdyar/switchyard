import { orderEditUpdateItemQuantityWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { AdminPostOrderEditsUpdateItemQuantityReqSchemaType } from "../../../../validators"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPostOrderEditsUpdateItemQuantityReqSchemaType>,
  res: SwitchyardResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id, item_id } = req.params

  const { result } = await orderEditUpdateItemQuantityWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      order_id: id,
      items: [
        {
          ...req.validatedBody,
          id: item_id,
        },
      ],
    },
  })

  res.json({
    order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}
