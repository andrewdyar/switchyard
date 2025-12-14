import { updateCartWorkflowId } from "@switchyard/core-flows"
import { AdditionalData, HttpTypes } from "@switchyard/framework/types"

import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { Modules } from "@switchyard/framework/utils"
import { refetchCart } from "../helpers"

export const GET = async (
  req: SwitchyardRequest<HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.StoreCartResponse>
) => {
  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.json({ cart })
}

export const POST = async (
  req: SwitchyardRequest<
    HttpTypes.StoreUpdateCart & AdditionalData,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<{
    cart: HttpTypes.StoreCart
  }>
) => {
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)

  await we.run(updateCartWorkflowId, {
    input: {
      ...req.validatedBody,
      id: req.params.id,
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
