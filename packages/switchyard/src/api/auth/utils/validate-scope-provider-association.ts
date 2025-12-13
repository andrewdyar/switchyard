import {
  SwitchyardNextFunction,
  SwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { ConfigModule } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  SwitchyardError,
} from "@switchyard/framework/utils"

// Middleware to validate that a scope is associated with a provider
export const validateScopeProviderAssociation = () => {
  return async (
    req: SwitchyardRequest,
    _: SwitchyardResponse,
    next: SwitchyardNextFunction
  ) => {
    const { actor_type, auth_provider } = req.params
    const config: ConfigModule = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    )

    const authMethodsPerActor =
      config.projectConfig?.http?.authMethodsPerActor ?? {}
    // Not having the config defined would allow for all auth providers for the particular actor.
    if (authMethodsPerActor[actor_type]) {
      if (!authMethodsPerActor[actor_type].includes(auth_provider)) {
        throw new SwitchyardError(
          SwitchyardError.Types.NOT_ALLOWED,
          `The actor type ${actor_type} is not allowed to use the auth provider ${auth_provider}`
        )
      }
    }

    next()
  }
}
