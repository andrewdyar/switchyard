import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { ContainerRegistrationKeys } from "@switchyard/framework/utils"

export const AUTHENTICATE = false

/**
 * @since 2.10.0
 */
export const GET = async (
  req: SwitchyardRequest,
  res: SwitchyardResponse<{ feature_flags: Record<string, boolean> }>
) => {
  const featureFlagRouter = req.scope.resolve(
    ContainerRegistrationKeys.FEATURE_FLAG_ROUTER
  ) as any

  const flags = featureFlagRouter.listFlags()

  // Convert array of flags to a simple key-value object
  const featureFlags: Record<string, boolean> = {}
  flags.forEach((flag) => {
    featureFlags[flag.key] = flag.value
  })

  res.json({ feature_flags: featureFlags })
}
