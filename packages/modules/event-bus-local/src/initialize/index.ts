import { MedusaModule } from "@switchyard/framework/modules-sdk"
import { IEventBusService } from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"

export const initialize = async (): Promise<IEventBusService> => {
  const serviceKey = Modules.EVENT_BUS
  const loaded = await MedusaModule.bootstrap<IEventBusService>({
    moduleKey: serviceKey,
    defaultPath: "@switchyard/event-bus-local",
  })

  return loaded[serviceKey]
}
