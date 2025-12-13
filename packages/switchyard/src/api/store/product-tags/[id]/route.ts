import { StoreProductTagResponse } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  SwitchyardError,
} from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { StoreProductTagParamsType } from "../validators"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<StoreProductTagParamsType>,
  res: SwitchyardResponse<StoreProductTagResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "product_tag",
    filters: {
      id: req.params.id,
    },
    fields: req.queryConfig.fields,
  })

  if (!data.length) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Product tag with id: ${req.params.id} was not found`
    )
  }
  res.json({ product_tag: data[0] })
}
