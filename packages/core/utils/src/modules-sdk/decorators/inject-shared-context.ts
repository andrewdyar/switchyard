import { Context } from "@switchyard/types"
import { SwitchyardContextType } from "./context-parameter"

export function InjectSharedContext(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: any
  ): void {
    if (!target.SwitchyardContextIndex_) {
      throw new Error(
        `To apply @InjectSharedContext you have to flag a parameter using @SwitchyardContext`
      )
    }

    const originalMethod = descriptor.value
    const argIndex = target.SwitchyardContextIndex_[propertyKey]

    descriptor.value = function (...args: any[]) {
      const context: Context = {
        ...(args[argIndex] ?? { __type: SwitchyardContextType }),
      }
      args[argIndex] = context

      return originalMethod.apply(this, args)
    }
  }
}
