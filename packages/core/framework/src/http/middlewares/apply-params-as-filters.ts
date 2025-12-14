import type {
  SwitchyardNextFunction,
  SwitchyardRequest,
  SwitchyardResponse,
} from "../types"

export function applyParamsAsFilters(mappings: { [param: string]: string }) {
  return async function paramsAsFiltersMiddleware(
    req: SwitchyardRequest,
    _: SwitchyardResponse,
    next: SwitchyardNextFunction
  ) {
    for (const [param, paramValue] of Object.entries(req.params)) {
      if (mappings[param]) {
        req.filterableFields[mappings[param]] = paramValue
      }
    }

    return next()
  }
}
