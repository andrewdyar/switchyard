import { SwitchyardContainer } from "@switchyard/framework/types"
import { refetchEntity } from "@switchyard/framework/http"

export const refetchOrder = async (
  idOrFilter: string | object,
  scope: SwitchyardContainer,
  fields: string[]
) => {
  return await refetchEntity({ entity: "order", idOrFilter, scope, fields })
}
