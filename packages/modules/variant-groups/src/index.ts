import { Module } from "@switchyard/framework/utils"
import VariantGroupModuleService from "./services/variant-group-module-service"

export const VARIANT_GROUPS_MODULE = "variantGroups"

export default Module(VARIANT_GROUPS_MODULE, {
  service: VariantGroupModuleService,
})

export * from "./models"
export * from "./types"
export { joinerConfig } from "./joiner-config"
