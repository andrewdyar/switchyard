import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

export const POST = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  req.session.auth_context = req.auth_context

  res.status(200).json({ user: req.auth_context })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  req.session.destroy()
  res.json({ success: true })
}
