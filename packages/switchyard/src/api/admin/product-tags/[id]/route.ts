import {
  deleteProductTagsWorkflow,
  updateProductTagsWorkflow,
} from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntity,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminProductTagParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductTagResponse>
) => {
  const productTag = await refetchEntity({
    entity: "product_tag",
    idOrFilter: req.params.id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ product_tag: productTag })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateProductTag,
    HttpTypes.AdminProductTagParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductTagResponse>
) => {
  const existingProductTag = await refetchEntity({
    entity: "product_tag",
    idOrFilter: req.params.id,
    scope: req.scope,
    fields: ["id"],
  })

  if (!existingProductTag) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Product tag with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateProductTagsWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const productTag = await refetchEntity({
    entity: "product_tag",
    idOrFilter: result[0].id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ product_tag: productTag })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminProductTagDeleteResponse>
) => {
  const id = req.params.id

  await deleteProductTagsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "product_tag",
    deleted: true,
  })
}
