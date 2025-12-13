import { StoreProductCategoryResponse } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntity,
} from "@switchyard/framework/http"
import { StoreProductCategoryParamsType } from "../validators"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<StoreProductCategoryParamsType>,
  res: SwitchyardResponse<StoreProductCategoryResponse>
) => {
  const category = await refetchEntity({
    entity: "product_category",
    idOrFilter: { id: req.params.id, ...req.filterableFields },
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  if (!category) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Product category with id: ${req.params.id} was not found`
    )
  }
  res.json({ product_category: category })
}
