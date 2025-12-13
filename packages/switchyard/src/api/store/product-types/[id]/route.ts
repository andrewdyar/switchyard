import { StoreProductTypeResponse } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  SwitchyardError,
} from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { StoreProductTypeParamsType } from "../validators"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<StoreProductTypeParamsType>,
  res: SwitchyardResponse<StoreProductTypeResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "product_type",
    filters: {
      id: req.params.id,
    },
    fields: req.queryConfig.fields,
  })

  if (!data.length) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Product type with id: ${req.params.id} was not found`
    )
  }
  res.json({ product_type: data[0] })
}
