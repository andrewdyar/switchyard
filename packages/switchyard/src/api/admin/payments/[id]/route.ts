import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { AdminGetPaymentParamsType } from "../validators"
import { refetchPayment } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<AdminGetPaymentParamsType>,
  res: SwitchyardResponse<HttpTypes.AdminPaymentResponse>
) => {
  const payment = await refetchPayment(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ payment })
}
