import { cancelReturnWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { AdminPostCancelReturnReqSchemaType } from "../../validators"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminPostCancelReturnReqSchemaType>,
  res: SwitchyardResponse<HttpTypes.AdminReturnResponse>
) => {
  const { id } = req.params

  const workflow = cancelReturnWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      ...req.validatedBody,
      return_id: id,
    },
  })

  res.status(200).json({ return: result as HttpTypes.AdminReturn })
}
