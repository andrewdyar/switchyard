import { capturePaymentWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchPayment } from "../../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCapturePayment,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminPaymentResponse>
) => {
  const { id } = req.params

  await capturePaymentWorkflow(req.scope).run({
    input: {
      payment_id: id,
      captured_by: req.auth_context.actor_id,
      amount: req.validatedBody.amount,
    },
  })

  const payment = await refetchPayment(id, req.scope, req.queryConfig.fields)

  res.status(200).json({ payment })
}
