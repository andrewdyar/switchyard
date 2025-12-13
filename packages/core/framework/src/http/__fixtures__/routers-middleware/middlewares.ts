import { raw } from "express"
import { z } from "zod"
import { SwitchyardNextFunction, SwitchyardRequest, SwitchyardResponse } from "../../types"
import { defineMiddlewares } from "../../utils/define-middlewares"
import {
  customersCreateMiddlewareMock,
  customersCreateMiddlewareValidatorMock,
  customersGlobalMiddlewareMock,
  storeGlobalMiddlewareMock,
} from "../mocks"

const customersGlobalMiddleware = (
  req: SwitchyardRequest,
  res: SwitchyardResponse,
  next: SwitchyardNextFunction
) => {
  customersGlobalMiddlewareMock()
  next()
}

const customersCreateMiddleware = (
  req: SwitchyardRequest,
  res: SwitchyardResponse,
  next: SwitchyardNextFunction
) => {
  if (req.additionalDataValidator) {
    customersCreateMiddlewareValidatorMock()
  }
  customersCreateMiddlewareMock()
  next()
}

const storeGlobal = (
  req: SwitchyardRequest,
  res: SwitchyardResponse,
  next: SwitchyardNextFunction
) => {
  storeGlobalMiddlewareMock()
  next()
}

const middlewares = defineMiddlewares([
  {
    matcher: "/customers",
    middlewares: [customersGlobalMiddleware],
  },
  {
    method: ["ALL"],
    matcher: "/v1*",
    bodyParser: {
      sizeLimit: "500kb",
    },
    middlewares: [],
  },
  {
    method: "POST",
    matcher: "/customers",
    additionalDataValidator: {
      group_id: z.string(),
    },
    middlewares: [customersCreateMiddleware],
  },
  {
    matcher: "/store/*",
    middlewares: [storeGlobal],
  },
  {
    matcher: "/webhooks",
    bodyParser: {
      preserveRawBody: true,
    },
  },
  {
    matcher: "/webhooks/*",
    method: "POST",
    bodyParser: false,
    middlewares: [raw({ type: "application/json" })],
  },
])

export default middlewares
