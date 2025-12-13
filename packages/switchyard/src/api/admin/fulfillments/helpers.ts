import { SwitchyardContainer } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"

export const refetchFulfillment = async (
  fulfillmentId: string,
  scope: SwitchyardContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "fulfillments",
    variables: {
      filters: { id: fulfillmentId },
    },
    fields: fields,
  })

  const [fulfillment] = await remoteQuery(queryObject)

  return fulfillment
}
