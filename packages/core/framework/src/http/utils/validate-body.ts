import { z } from "zod"
import { NextFunction } from "express"
import { SwitchyardRequest, SwitchyardResponse } from "../types"
import { zodValidator } from "../../zod"

export function validateAndTransformBody(
  zodSchema:
    | z.ZodObject<any, any>
    | z.ZodEffects<any, any>
    | ((
        customSchema?: z.ZodOptional<z.ZodNullable<z.ZodObject<any, any>>>
      ) => z.ZodObject<any, any> | z.ZodEffects<any, any>)
): (
  req: SwitchyardRequest,
  res: SwitchyardResponse,
  next: NextFunction
) => Promise<void> {
  return async function validateBody(
    req: SwitchyardRequest,
    _: SwitchyardResponse,
    next: NextFunction
  ) {
    try {
      let schema: z.ZodObject<any, any> | z.ZodEffects<any, any>
      if (typeof zodSchema === "function") {
        schema = zodSchema(req.additionalDataValidator)
      } else {
        schema = zodSchema
      }

      req.validatedBody = await zodValidator(schema, req.body)
      next()
    } catch (e) {
      next(e)
    }
  }
}
