import { FulfillmentModuleService } from "@services"
import loadProviders from "./loaders/providers"
import { Module, Modules } from "@switchyard/framework/utils"

export default Module(Modules.FULFILLMENT, {
  service: FulfillmentModuleService,
  loaders: [loadProviders],
})

// Module options types
export { FulfillmentModuleOptions } from "./types"
