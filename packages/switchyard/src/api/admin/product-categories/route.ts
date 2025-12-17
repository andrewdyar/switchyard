import { createProductCategoriesWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntities,
} from "@switchyard/framework/http"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminProductCategoryListParams>,
  res: SwitchyardResponse<HttpTypes.AdminProductCategoryListResponse>
) => {
  // Handle parent_category_id=null filter (convert string "null" to actual null)
  const filters = { ...req.filterableFields } as Record<string, any>
  if (filters.parent_category_id === "null") {
    filters.parent_category_id = null
  }

  const { data: product_categories, metadata } = await refetchEntities({
    entity: "product_category",
    idOrFilter: filters,
    scope: req.scope,
    fields: req.queryConfig.fields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    product_categories,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreateProductCategory,
    HttpTypes.AdminProductCategoryParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductCategoryResponse>
) => {
  const { result } = await createProductCategoriesWorkflow(req.scope).run({
    input: { product_categories: [req.validatedBody] },
  })

  const {
    data: [category],
  } = await refetchEntities({
    entity: "product_category",
    idOrFilter: { id: result[0].id, ...req.filterableFields },
    scope: req.scope,
    fields: req.queryConfig.fields,
    pagination: req.queryConfig.pagination,
  })

  res.status(200).json({ product_category: category })
}
