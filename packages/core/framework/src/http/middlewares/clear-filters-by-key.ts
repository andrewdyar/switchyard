import type {
  SwitchyardNextFunction,
  SwitchyardRequest,
  SwitchyardResponse,
} from "../types"

export function clearFiltersByKey(keys: string[]) {
  return async function clearFiltersByKeyMiddleware(
    req: SwitchyardRequest,
    _: SwitchyardResponse,
    next: SwitchyardNextFunction
  ) {
    keys.forEach((key) => {
      delete req.filterableFields[key]
    })

    return next()
  }
}
