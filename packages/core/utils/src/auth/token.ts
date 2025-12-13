import jwt, { type Secret, type SignOptions } from "jsonwebtoken"
import { SwitchyardError } from "../common"

export const generateJwtToken = (
  tokenPayload: Record<string, unknown>,
  jwtConfig: {
    secret?: Secret
    expiresIn?: number | string
    jwtOptions?: SignOptions
  }
) => {
  if (
    !jwtConfig.secret ||
    (!jwtConfig.expiresIn && !jwtConfig.jwtOptions?.expiresIn)
  ) {
    throw new SwitchyardError(
      SwitchyardError.Types.INVALID_ARGUMENT,
      "JWT secret and expiresIn must be provided when generating a token"
    )
  }

  const expiresIn = jwtConfig.expiresIn ?? jwtConfig.jwtOptions?.expiresIn
  return jwt.sign(tokenPayload, jwtConfig.secret, {
    ...jwtConfig.jwtOptions,
    expiresIn,
  })
}
