import { cancelOrderClaimWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { AdminPostCancelClaimReqSchemaType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminPostCancelClaimReqSchemaType>,
  res: MedusaResponse<HttpTypes.AdminClaimResponse>
) => {
  const { id } = req.params

  const workflow = cancelOrderClaimWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      ...req.validatedBody,
      claim_id: id,
      canceled_by: req.auth_context.actor_id,
    },
  })

  res.status(200).json({ claim: result as HttpTypes.AdminClaim })
}
