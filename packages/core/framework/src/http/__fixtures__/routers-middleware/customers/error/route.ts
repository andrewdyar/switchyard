import { Request, Response } from "express"
import { MedusaError } from "@switchyard/utils"

export const GET = async (req: Request, res: Response) => {
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not allowed")
}
