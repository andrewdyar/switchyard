import { ModuleProvider, Modules } from "@switchyard/framework/utils"
import { ManualFulfillmentService } from "./services/manual-fulfillment"

const services = [ManualFulfillmentService]

export default ModuleProvider(Modules.FULFILLMENT, {
  services,
})
