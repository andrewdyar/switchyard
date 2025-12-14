import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import {
  deleteStockLocationsWorkflow,
  updateStockLocationsWorkflow,
} from "@switchyard/core-flows"
import { SwitchyardError } from "@switchyard/framework/utils"
import { refetchStockLocation } from "../helpers"
import {
  AdminGetStockLocationParamsType,
} from "../validators"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateStockLocation,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminStockLocationResponse>
) => {
  const { id } = req.params
  await updateStockLocationsWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const stockLocation = await refetchStockLocation(
    id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({
    stock_location: stockLocation,
  })
}

export const GET = async (
  req: AuthenticatedSwitchyardRequest<AdminGetStockLocationParamsType>,
  res: SwitchyardResponse<HttpTypes.AdminStockLocationResponse>
) => {
  const { id } = req.params

  const stockLocation = await refetchStockLocation(
    id,
    req.scope,
    req.queryConfig.fields
  )

  if (!stockLocation) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Stock location with id: ${id} was not found`
    )
  }

  res.status(200).json({ stock_location: stockLocation })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminStockLocationDeleteResponse>
) => {
  const { id } = req.params

  await deleteStockLocationsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "stock_location",
    deleted: true,
  })
}
