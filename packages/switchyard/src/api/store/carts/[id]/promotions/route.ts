import { updateCartPromotionsWorkflowId } from "@switchyard/core-flows"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { Modules, PromotionActions } from "@switchyard/framework/utils"
import { refetchCart } from "../../helpers"

export const POST = async (
  req: SwitchyardRequest<HttpTypes.StoreCartAddPromotion, HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.StoreCartResponse>
) => {
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  const payload = req.validatedBody

  await we.run(updateCartPromotionsWorkflowId, {
    input: {
      promo_codes: payload.promo_codes,
      cart_id: req.params.id,
      action:
        payload.promo_codes.length > 0
          ? PromotionActions.ADD
          : PromotionActions.REPLACE,
    },
  })

  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ cart })
}

export const DELETE = async (
  req: SwitchyardRequest<
    HttpTypes.StoreCartRemovePromotion,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<{
    cart: HttpTypes.StoreCart
  }>
) => {
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  const payload = req.validatedBody

  await we.run(updateCartPromotionsWorkflowId, {
    input: {
      promo_codes: payload.promo_codes,
      cart_id: req.params.id,
      action: PromotionActions.REMOVE,
    },
  })

  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ cart })
}
