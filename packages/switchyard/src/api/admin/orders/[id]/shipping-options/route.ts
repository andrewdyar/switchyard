import { listShippingOptionsForOrderWorkflow } from "@switchyard/core-flows"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { AdminShippingOption, HttpTypes } from "@switchyard/framework/types"

/**
 * @since 2.10.0
 */
export const GET = async (
  req: SwitchyardRequest<{}, HttpTypes.AdminGetOrderShippingOptionList>,
  res: SwitchyardResponse<{ shipping_options: AdminShippingOption[] }>
) => {
  const { id } = req.params

  const workflow = listShippingOptionsForOrderWorkflow(req.scope)
  const { result: shipping_options } = await workflow.run({
    input: {
      order_id: id,
    },
  })

  res.json({ shipping_options })
}
