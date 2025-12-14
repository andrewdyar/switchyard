import { StoreProductCategoryResponse } from "@switchyard/framework/types"
import { MedusaError } from "@switchyard/framework/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  refetchEntity,
} from "@switchyard/framework/http"
import { StoreProductCategoryParamsType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreProductCategoryParamsType>,
  res: MedusaResponse<StoreProductCategoryResponse>
) => {
  const category = await refetchEntity({
    entity: "product_category",
    idOrFilter: { id: req.params.id, ...req.filterableFields },
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  if (!category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product category with id: ${req.params.id} was not found`
    )
  }
  res.json({ product_category: category })
}
