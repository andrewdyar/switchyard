import { linkCustomerGroupsToCustomerWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { HttpTypes } from "@switchyard/framework/types"

import { refetchCustomer } from "../../helpers"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminBatchLink,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminCustomerResponse>
) => {
  const { id } = req.params
  const { add, remove } = req.validatedBody

  const workflow = linkCustomerGroupsToCustomerWorkflow(req.scope)
  await workflow.run({
    input: {
      id,
      add,
      remove,
    },
  })

  const customer = await refetchCustomer(id, req.scope, req.queryConfig.fields)

  res.status(200).json({ customer: customer })
}
