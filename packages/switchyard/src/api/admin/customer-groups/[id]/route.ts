import {
  deleteCustomerGroupsWorkflow,
  updateCustomerGroupsWorkflow,
} from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { SwitchyardError } from "@switchyard/framework/utils"
import { refetchCustomerGroup } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.AdminCustomerGroupResponse>
) => {
  const customerGroup = await refetchCustomerGroup(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  if (!customerGroup) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Customer group with id: ${req.params.id} not found`
    )
  }

  res.status(200).json({ customer_group: customerGroup })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateCustomerGroup,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminCustomerGroupResponse>
) => {
  const existingCustomerGroup = await refetchCustomerGroup(
    req.params.id,
    req.scope,
    ["id"]
  )
  if (!existingCustomerGroup) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Customer group with id "${req.params.id}" not found`
    )
  }

  await updateCustomerGroupsWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const customerGroup = await refetchCustomerGroup(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ customer_group: customerGroup })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminCustomerGroupDeleteResponse>
) => {
  const id = req.params.id
  const deleteCustomerGroups = deleteCustomerGroupsWorkflow(req.scope)

  await deleteCustomerGroups.run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "customer_group",
    deleted: true,
  })
}
