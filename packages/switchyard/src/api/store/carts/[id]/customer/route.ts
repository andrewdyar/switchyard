import { transferCartCustomerWorkflowId } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { Modules } from "@switchyard/framework/utils"
import { AdditionalData } from "@switchyard/types"
import { refetchCart } from "../../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdditionalData, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>
) => {
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)

  await we.run(transferCartCustomerWorkflowId, {
    input: {
      id: req.params.id,
      customer_id: req.auth_context?.actor_id,
      additional_data: req.validatedBody.additional_data,
    },
  })

  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ cart })
}
