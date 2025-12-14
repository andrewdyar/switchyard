import {
  deleteProductTypesWorkflow,
  updateProductTypesWorkflow,
} from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { refetchProductType } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminProductTypeParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductTypeResponse>
) => {
  const productType = await refetchProductType(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ product_type: productType })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateProductType,
    HttpTypes.AdminProductTypeParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductTypeResponse>
) => {
  const existingProductType = await refetchProductType(
    req.params.id,
    req.scope,
    ["id"]
  )

  if (!existingProductType) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Product type with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateProductTypesWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const productType = await refetchProductType(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ product_type: productType })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminProductTypeDeleteResponse>
) => {
  const id = req.params.id

  await deleteProductTypesWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "product_type",
    deleted: true,
  })
}
