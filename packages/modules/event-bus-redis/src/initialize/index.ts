import { SwitchyardModule } from "@switchyard/framework/modules-sdk"
import {
  ExternalModuleDeclaration,
  IEventBusService,
  InternalModuleDeclaration,
} from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"
import { EventBusRedisModuleOptions } from "../types"

export const initialize = async (
  options?: EventBusRedisModuleOptions | ExternalModuleDeclaration
): Promise<IEventBusService> => {
  const serviceKey = Modules.EVENT_BUS
  const loaded = await SwitchyardModule.bootstrap<IEventBusService>({
    moduleKey: serviceKey,
    defaultPath: "@switchyard/event-bus-redis",
    declaration: options as
      | InternalModuleDeclaration
      | ExternalModuleDeclaration,
  })

  return loaded[serviceKey]
}
