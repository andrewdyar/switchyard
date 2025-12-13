import { SwitchyardService } from "@switchyard/utils"
import { Brand } from "./models/brand"

export class BrandModuleService extends SwitchyardService({
  Brand,
}) {}
