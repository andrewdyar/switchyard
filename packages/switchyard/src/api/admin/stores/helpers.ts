import { SwitchyardContainer } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"

export const refetchStore = async (
  storeId: string,
  scope: SwitchyardContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "store",
    variables: {
      filters: { id: storeId },
    },
    fields: fields,
  })

  const stores = await remoteQuery(queryObject)
  return stores[0]
}
