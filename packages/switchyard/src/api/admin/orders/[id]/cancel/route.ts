import { cancelOrderWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<{}, HttpTypes.AdminGetOrderParams>,
  res: SwitchyardResponse<HttpTypes.AdminOrderResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const variables = { id: req.params.id }

  const input = {
    order_id: req.params.id,
    canceled_by: req.auth_context.actor_id,
  }

  await cancelOrderWorkflow(req.scope).run({
    input,
  })

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables,
    fields: req.queryConfig.fields,
  })

  const [order] = await remoteQuery(queryObject)

  res.status(200).json({ order })
}
