import { IEventBusModuleService, Logger } from "@switchyard/framework/types"

export type InitializeModuleInjectableDependencies = {
  logger?: Logger
  EventBus?: IEventBusModuleService
}
