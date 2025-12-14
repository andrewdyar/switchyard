import { listShippingOptionsForCartWorkflow } from "@switchyard/core-flows"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: SwitchyardRequest<{}, HttpTypes.StoreGetShippingOptionList>,
  res: SwitchyardResponse<HttpTypes.StoreShippingOptionListResponse>
) => {
  const { cart_id, is_return } = req.filterableFields

  const workflow = listShippingOptionsForCartWorkflow(req.scope)
  const { result: shipping_options } = await workflow.run({
    input: { 
      cart_id, 
      is_return: !!is_return,
      fields: req.queryConfig.fields
    },
  })

  res.json({ shipping_options })
}
