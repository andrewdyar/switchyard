import { SwitchyardContainer } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import { AdminPriceListRemoteQueryDTO } from "../types"

export async function listPriceLists({
  container,
  remoteQueryFields,
  variables,
}: {
  container: SwitchyardContainer
  remoteQueryFields: string[]
  variables: Record<string, any>
}): Promise<[AdminPriceListRemoteQueryDTO[], number]> {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "price_list",
    fields: remoteQueryFields,
    variables,
  })

  const { rows: priceLists, metadata } = await remoteQuery(queryObject)

  return [priceLists, metadata.count]
}
