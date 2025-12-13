import { FetchError } from "@switchyard/js-sdk"

export const isFetchError = (error: any): error is FetchError => {
  return error instanceof FetchError
}
