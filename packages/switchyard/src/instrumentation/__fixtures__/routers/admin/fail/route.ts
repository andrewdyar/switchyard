import { SwitchyardError } from "@switchyard/framework/utils"
import { Request, Response } from "express"

export function GET(req: Request, res: Response) {
  throw new SwitchyardError(SwitchyardError.Types.INVALID_DATA, "Failed")
}
