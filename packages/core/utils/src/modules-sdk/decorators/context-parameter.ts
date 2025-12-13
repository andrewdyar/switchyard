export function SwitchyardContext() {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    target.SwitchyardContextIndex_ ??= {}
    target.SwitchyardContextIndex_[propertyKey] = parameterIndex
  }
}

SwitchyardContext.getIndex = function (
  target: any,
  propertyKey: string
): number | undefined {
  return target.SwitchyardContextIndex_?.[propertyKey]
}

export const SwitchyardContextType = "SwitchyardContext"
