import { createOrderFulfillmentWorkflow } from "@switchyard/core-flows"
import { AdditionalData, HttpTypes } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreateOrderFulfillment & AdditionalData,
    HttpTypes.AdminGetOrderParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminOrderResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  await createOrderFulfillmentWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      order_id: req.params.id,
    },
  })

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { id: req.params.id },
    fields: req.queryConfig.fields,
  })

  const [order] = await remoteQuery(queryObject)
  res.status(200).json({ order })
}
