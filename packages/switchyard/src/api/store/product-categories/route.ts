import {
  StoreProductCategoryListParams,
  StoreProductCategoryListResponse,
} from "@switchyard/framework/types"
import { ContainerRegistrationKeys } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<StoreProductCategoryListParams>,
  res: SwitchyardResponse<StoreProductCategoryListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: product_categories, metadata } = await query.graph({
    entity: "product_category",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    product_categories,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  })
}
