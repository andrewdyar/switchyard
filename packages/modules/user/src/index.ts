import { UserModuleService } from "@services"
import { Module, Modules } from "@switchyard/framework/utils"

export default Module(Modules.USER, {
  service: UserModuleService,
})
