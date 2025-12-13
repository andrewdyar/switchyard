import { addToCartWorkflowId } from "@switchyard/core-flows"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { AdditionalData } from "@switchyard/types"
import { Modules } from "@switchyard/utils"
import { refetchCart } from "../../helpers"

export const POST = async (
  req: SwitchyardRequest<
    HttpTypes.StoreAddCartLineItem & AdditionalData,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.StoreCartResponse>
) => {
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(addToCartWorkflowId, {
    input: {
      cart_id: req.params.id,
      items: [req.validatedBody],
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
