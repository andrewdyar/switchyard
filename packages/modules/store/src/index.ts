import { StoreModuleService } from "@services"
import { Module, Modules } from "@switchyard/framework/utils"

export default Module(Modules.STORE, {
  service: StoreModuleService,
})
