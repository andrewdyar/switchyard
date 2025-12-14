import {
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { remapKeysForProduct, remapProductResponse } from "../helpers"
import { SwitchyardError } from "@switchyard/framework/utils"
import { AdditionalData, HttpTypes } from "@switchyard/framework/types"
import { refetchEntity } from "@switchyard/framework/http"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.AdminProductResponse>
) => {
  const selectFields = remapKeysForProduct(req.queryConfig.fields ?? [])
  const product = await refetchEntity({
    entity: "product",
    idOrFilter: req.params.id,
    scope: req.scope,
    fields: selectFields,
  })

  if (!product) {
    throw new SwitchyardError(SwitchyardError.Types.NOT_FOUND, "Product not found")
  }

  res.status(200).json({ product: remapProductResponse(product) })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateProduct & AdditionalData,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminProductResponse>
) => {
  const { additional_data, ...update } = req.validatedBody

  const existingProduct = await refetchEntity({
    entity: "product",
    idOrFilter: req.params.id,
    scope: req.scope,
    fields: ["id"],
  })
  /**
   * Check if the product exists with the id or not before calling the workflow.
   */
  if (!existingProduct) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Product with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateProductsWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update,
      additional_data,
    },
  })

  const product = await refetchEntity({
    entity: "product",
    idOrFilter: result[0].id,
    scope: req.scope,
    fields: remapKeysForProduct(req.queryConfig.fields ?? []),
  })

  res.status(200).json({ product: remapProductResponse(product) })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminProductDeleteResponse>
) => {
  const id = req.params.id

  await deleteProductsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "product",
    deleted: true,
  })
}
