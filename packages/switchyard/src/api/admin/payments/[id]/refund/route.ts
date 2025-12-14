import { refundPaymentWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchPayment } from "../../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminRefundPayment,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminPaymentResponse>
) => {
  const { id } = req.params
  await refundPaymentWorkflow(req.scope).run({
    input: {
      payment_id: id,
      created_by: req.auth_context.actor_id,
      ...req.validatedBody,
    },
  })

  const payment = await refetchPayment(id, req.scope, req.queryConfig.fields)

  res.status(200).json({ payment })
}
