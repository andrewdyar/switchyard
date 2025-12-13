import { MiddlewareRoute } from "@switchyard/framework/http"
import { storeReturnsRoutesMiddlewares } from "./returns/middlewares"

export const storeRoutesMiddlewares: MiddlewareRoute[] = [
  ...storeReturnsRoutesMiddlewares,
]
