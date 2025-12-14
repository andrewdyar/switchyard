import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntities,
  refetchEntity,
} from "@switchyard/framework/http"

import { createProductTagsWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminProductTagListParams>,
  res: SwitchyardResponse<HttpTypes.AdminProductTagListResponse>
) => {
  const { data: product_tags, metadata } = await refetchEntities({
    entity: "product_tag",
    idOrFilter: req.filterableFields,
    scope: req.scope,
    fields: req.queryConfig.fields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    product_tags: product_tags,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreateProductTag,
    HttpTypes.AdminProductTagParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductTagResponse>
) => {
  const input = [req.validatedBody]

  const { result } = await createProductTagsWorkflow(req.scope).run({
    input: { product_tags: input },
  })

  const productTag = await refetchEntity({
    entity: "product_tag",
    idOrFilter: result[0].id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ product_tag: productTag })
}
