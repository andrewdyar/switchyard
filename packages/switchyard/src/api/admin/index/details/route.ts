import { AuthenticatedSwitchyardRequest, SwitchyardResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"

/**
 * Get the index information for all entities that are indexed and their sync state
 * 
 * @since 2.11.2
 * @featureFlag index
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest<void>,
  res: SwitchyardResponse<HttpTypes.AdminIndexDetailsResponse>
) => {
  const indexModuleService = req.scope.resolve(Modules.INDEX)
  const indexInfo = await indexModuleService.getInfo()
  res.json({
    metadata: indexInfo,
  })
}
