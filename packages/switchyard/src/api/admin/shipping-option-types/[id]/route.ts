import {
  deleteShippingOptionTypesWorkflow,
  updateShippingOptionTypesWorkflow,
} from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { refetchShippingOptionType } from "../helpers"
import {
  AdminGetShippingOptionTypeParamsType,
} from "../validators"
import { HttpTypes } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"

/**
 * @since 2.10.0
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest<AdminGetShippingOptionTypeParamsType>,
  res: SwitchyardResponse<HttpTypes.AdminShippingOptionTypeResponse>
) => {
  const shippingOptionType = await refetchShippingOptionType(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ shipping_option_type: shippingOptionType })
}

/**
 * @since 2.10.0
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateShippingOptionType,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminShippingOptionTypeResponse>
) => {
  const existingShippingOptionType = await refetchShippingOptionType(
    req.params.id,
    req.scope,
    ["id"]
  )

  if (!existingShippingOptionType) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Shipping option type with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateShippingOptionTypesWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const shippingOptionType = await refetchShippingOptionType(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ shipping_option_type: shippingOptionType })
}

/**
 * @since 2.10.0
 */
export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminShippingOptionTypeDeleteResponse>
) => {
  const id = req.params.id

  await deleteShippingOptionTypesWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "shipping_option_type",
    deleted: true,
  })
}
