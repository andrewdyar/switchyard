import { SwitchyardContainer } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  SwitchyardError,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"

export const refetchCart = async (
  id: string,
  scope: SwitchyardContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id } },
    fields,
  })

  const [cart] = await remoteQuery(queryObject)

  if (!cart) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Cart with id '${id}' not found`
    )
  }

  return cart
}
