import { CustomerModuleService } from "@services"
import { Module, Modules } from "@switchyard/framework/utils"

export default Module(Modules.CUSTOMER, {
  service: CustomerModuleService,
})
