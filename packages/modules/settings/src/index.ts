import { SettingsModuleService } from "@/services"
import { Module } from "@switchyard/framework/utils"
import { Modules } from "@switchyard/utils"

export default Module(Modules.SETTINGS, {
  service: SettingsModuleService,
})
