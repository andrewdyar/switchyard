import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"

import { createInvitesWorkflow } from "@switchyard/core-flows"
import { refetchInvite } from "./helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminGetInvitesParams>,
  res: SwitchyardResponse<HttpTypes.AdminInviteListResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "invite",
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: invites, metadata } = await remoteQuery(queryObject)

  res.json({
    invites,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreateInvite,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminInviteResponse>
) => {
  const workflow = createInvitesWorkflow(req.scope)

  const input = {
    input: {
      invites: [req.validatedBody],
    },
  }

  const { result } = await workflow.run(input)

  const invite = await refetchInvite(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ invite })
}

export const AUTHENTICATE = false
