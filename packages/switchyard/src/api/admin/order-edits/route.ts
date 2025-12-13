import { beginOrderEditOrderWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { AdminPostOrderEditsReqSchemaType } from "./validators"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPostOrderEditsReqSchemaType>,
  res: SwitchyardResponse<HttpTypes.AdminOrderEditResponse>
) => {
  const input = req.validatedBody as AdminPostOrderEditsReqSchemaType

  const workflow = beginOrderEditOrderWorkflow(req.scope)
  const { result } = await workflow.run({
    input,
  })

  res.json({
    order_change: result as unknown as HttpTypes.AdminOrderChange,
  })
}
