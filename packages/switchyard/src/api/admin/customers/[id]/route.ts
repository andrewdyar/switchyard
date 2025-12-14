import {
  removeCustomerAccountWorkflow,
  updateCustomersWorkflow,
} from "@switchyard/core-flows"
import { AdditionalData, HttpTypes } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchCustomer } from "../helpers"
import { AdminUpdateCustomerType } from "../validators"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<{}, HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.AdminCustomerResponse>
) => {
  const customer = await refetchCustomer(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  if (!customer) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Customer with id: ${req.params.id} not found`
    )
  }

  res.status(200).json({ customer })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    AdminUpdateCustomerType & AdditionalData,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminCustomerResponse>
) => {
  const existingCustomer = await refetchCustomer(req.params.id, req.scope, [
    "id",
  ])
  if (!existingCustomer) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Customer with id "${req.params.id}" not found`
    )
  }

  const { additional_data, ...rest } = req.validatedBody

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: rest,
      additional_data,
    },
  })

  const customer = await refetchCustomer(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ customer })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminCustomerDeleteResponse>
) => {
  const id = req.params.id

  await removeCustomerAccountWorkflow(req.scope).run({
    input: {
      customerId: id,
    },
  })

  res.status(200).json({
    id,
    object: "customer",
    deleted: true,
  })
}
