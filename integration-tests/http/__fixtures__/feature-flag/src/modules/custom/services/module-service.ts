import { IModuleService } from "@switchyard/types"
import { SwitchyardContext } from "@switchyard/utils"

// @ts-expect-error
export class ModuleService implements IModuleService {
  public property = "value"

  constructor() {}
  async methodName(input, @SwitchyardContext() context) {
    return input + " called"
  }
}
