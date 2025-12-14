import { cancelFulfillmentWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { refetchFulfillment } from "../../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedMedusaRequest<{}, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.AdminFulfillmentResponse>
) => {
  const { id } = req.params
  await cancelFulfillmentWorkflow(req.scope).run({
    input: { id },
  })

  const fulfillment = await refetchFulfillment(
    id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ fulfillment })
}
