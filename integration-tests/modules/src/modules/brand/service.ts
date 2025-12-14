import { MedusaService } from "@switchyard/utils"
import { Brand } from "./models/brand"

export class BrandModuleService extends MedusaService({
  Brand,
}) {}
