import {
  deleteShippingOptionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@switchyard/core-flows"
import { FulfillmentWorkflow, HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchShippingOption } from "../helpers"
import { SwitchyardError } from "@switchyard/framework/utils"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.AdminShippingOptionResponse>
) => {
  const shippingOption = await refetchShippingOption(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  if (!shippingOption) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Shipping Option with id: ${req.params.id} not found`
    )
  }

  res.json({ shipping_option: shippingOption })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateShippingOption,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminShippingOptionResponse>
) => {
  const shippingOptionPayload = req.validatedBody

  const workflow = updateShippingOptionsWorkflow(req.scope)

  const workflowInput: FulfillmentWorkflow.UpdateShippingOptionsWorkflowInput =
    {
      id: req.params.id,
      ...shippingOptionPayload,
    }

  const { result } = await workflow.run({
    input: [workflowInput],
  })

  const shippingOption = await refetchShippingOption(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ shipping_option: shippingOption })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminShippingOptionDeleteResponse>
) => {
  const shippingOptionId = req.params.id

  const workflow = deleteShippingOptionsWorkflow(req.scope)

  await workflow.run({
    input: { ids: [shippingOptionId] },
  })

  res
    .status(200)
    .json({ id: shippingOptionId, object: "shipping_option", deleted: true })
}
