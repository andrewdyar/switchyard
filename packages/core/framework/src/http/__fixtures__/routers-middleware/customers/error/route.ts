import { Request, Response } from "express"
import { SwitchyardError } from "@switchyard/utils"

export const GET = async (req: Request, res: Response) => {
  throw new SwitchyardError(SwitchyardError.Types.NOT_ALLOWED, "Not allowed")
}
