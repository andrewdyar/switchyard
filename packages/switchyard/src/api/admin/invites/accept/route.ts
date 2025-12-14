import { acceptInviteWorkflow } from "@switchyard/core-flows"
import { HttpTypes, InviteWorkflow } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { AdminInviteAcceptType } from "../validators"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<AdminInviteAcceptType>,
  res: SwitchyardResponse<HttpTypes.AdminAcceptInviteResponse>
) => {
  if (req.auth_context.actor_id) {
    throw new SwitchyardError(
      SwitchyardError.Types.INVALID_DATA,
      "The user is already authenticated and cannot accept an invite."
    )
  }

  const input = {
    invite_token: req.filterableFields.token as string,
    auth_identity_id: req.auth_context.auth_identity_id,
    user: req.validatedBody,
  } as InviteWorkflow.AcceptInviteWorkflowInputDTO

  let users

  try {
    const { result } = await acceptInviteWorkflow(req.scope).run({ input })
    users = result
  } catch (e) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  res.status(200).json({ user: users[0] })
}

export const AUTHENTICATE = false
