import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { SwitchyardError } from "@switchyard/framework/utils"

import { deleteInvitesWorkflow } from "@switchyard/core-flows"
import { refetchInvite } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.AdminInviteResponse>
) => {
  const { id } = req.params
  const invite = await refetchInvite(id, req.scope, req.queryConfig.fields)

  if (!invite) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Invite with id: ${id} was not found`
    )
  }

  res.status(200).json({ invite })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminInviteDeleteResponse>
) => {
  const { id } = req.params
  const workflow = deleteInvitesWorkflow(req.scope)

  await workflow.run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "invite",
    deleted: true,
  })
}

export const AUTHENTICATE = false
