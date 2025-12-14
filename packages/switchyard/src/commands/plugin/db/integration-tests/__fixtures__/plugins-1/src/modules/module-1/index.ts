import { SwitchyardService, Module } from "@switchyard/framework/utils"

export default Module("module1", {
  service: class Module1Service extends SwitchyardService({}) {},
})
