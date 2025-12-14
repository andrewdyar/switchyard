import { linkCustomersToCustomerGroupWorkflow } from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import { HttpTypes } from "@switchyard/framework/types"
import { refetchCustomerGroup } from "../../helpers"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminBatchLink,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminCustomerGroupResponse>
) => {
  const { id } = req.params
  const { add, remove } = req.validatedBody

  const workflow = linkCustomersToCustomerGroupWorkflow(req.scope)
  await workflow.run({
    input: {
      id,
      add,
      remove,
    },
  })

  const customerGroup = await refetchCustomerGroup(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ customer_group: customerGroup })
}
