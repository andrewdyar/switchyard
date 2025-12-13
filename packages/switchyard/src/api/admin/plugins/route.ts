import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { ContainerRegistrationKeys, isString } from "@switchyard/framework/utils"

export const GET = async (
  req: SwitchyardRequest<unknown>,
  res: SwitchyardResponse<HttpTypes.AdminPluginsListResponse>
) => {
  const configModule = req.scope.resolve(
    ContainerRegistrationKeys.CONFIG_MODULE
  )

  const configPlugins = configModule.plugins ?? []

  const plugins = configPlugins.map((plugin) => ({
    name: isString(plugin) ? plugin : plugin.resolve,
  }))

  res.json({
    plugins,
  })
}
