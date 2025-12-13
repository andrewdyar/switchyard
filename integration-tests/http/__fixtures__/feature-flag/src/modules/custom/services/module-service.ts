import { IModuleService } from "@switchyard/types"
import { MedusaContext } from "@switchyard/utils"

// @ts-expect-error
export class ModuleService implements IModuleService {
  public property = "value"

  constructor() {}
  async methodName(input, @MedusaContext() context) {
    return input + " called"
  }
}
