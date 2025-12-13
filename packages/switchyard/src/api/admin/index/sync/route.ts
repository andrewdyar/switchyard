import { AuthenticatedSwitchyardRequest, SwitchyardResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"

/**
 * @since 2.11.2
 * @featureFlag index
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminIndexSyncPayload>,
  res: SwitchyardResponse
) => {
  const indexService = req.scope.resolve(Modules.INDEX)
  const strategy = req.validatedBody.strategy

  await indexService.sync({ strategy })

  res.send(200)
}
