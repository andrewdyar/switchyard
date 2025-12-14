import { createLinksWorkflow } from "@switchyard/core-flows"
import { Modules } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchVariant } from "../../../../helpers"
import { AdminCreateVariantInventoryItemType } from "../../../../validators"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    AdminCreateVariantInventoryItemType,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductVariantResponse>
) => {
  const variantId = req.params.variant_id

  await createLinksWorkflow(req.scope).run({
    input: [
      {
        [Modules.PRODUCT]: { variant_id: variantId },
        [Modules.INVENTORY]: {
          inventory_item_id: req.validatedBody.inventory_item_id,
        },
        data: { required_quantity: req.validatedBody.required_quantity },
      },
    ],
  })

  const variant = await refetchVariant(
    variantId,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ variant })
}
