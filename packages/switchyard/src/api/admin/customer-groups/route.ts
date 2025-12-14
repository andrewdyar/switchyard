import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { createCustomerGroupsWorkflow } from "@switchyard/core-flows"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import { refetchCustomerGroup } from "./helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminGetCustomerGroupsParams>,
  res: MedusaResponse<HttpTypes.AdminCustomerGroupListResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const query = remoteQueryObjectFromString({
    entryPoint: "customer_group",
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: customer_groups, metadata } = await remoteQuery(query)

  res.json({
    customer_groups,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.AdminCreateCustomerGroup,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.AdminCustomerGroupResponse>
) => {
  const createGroups = createCustomerGroupsWorkflow(req.scope)
  const customersData = [
    {
      ...req.validatedBody,
      created_by: req.auth_context.actor_id,
    },
  ]

  const { result } = await createGroups.run({
    input: { customersData },
  })

  const customerGroup = await refetchCustomerGroup(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ customer_group: customerGroup })
}

// TODO: Due to issues with our routing (and using router.use for applying middlewares), we have to opt-out of global auth in all routes, and then reapply it here.
// See https://medusacorp.slack.com/archives/C025KMS13SA/p1716455350491879 for details.
export const AUTHENTICATE = false
