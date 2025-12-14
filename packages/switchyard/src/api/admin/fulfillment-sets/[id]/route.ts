import { deleteFulfillmentSetsWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminFulfillmentSetDeleteResponse>
) => {
  const { id } = req.params

  await deleteFulfillmentSetsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "fulfillment_set",
    deleted: true,
  })
}
