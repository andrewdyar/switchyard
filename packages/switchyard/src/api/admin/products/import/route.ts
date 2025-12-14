import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { SwitchyardError } from "@switchyard/framework/utils"
import { importProductsWorkflow } from "@switchyard/core-flows"

/**
 * @deprecated use `POST /admin/products/imports` instead.
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminImportProductRequest>,
  res: SwitchyardResponse<HttpTypes.AdminImportProductResponse>
) => {
  const input = req.file as Express.Multer.File

  if (!input) {
    throw new SwitchyardError(
      SwitchyardError.Types.INVALID_DATA,
      "No file was uploaded for importing"
    )
  }

  const { result, transaction } = await importProductsWorkflow(req.scope).run({
    input: {
      filename: input.originalname,
      fileContent: input.buffer.toString("utf-8"),
    },
  })

  res
    .status(202)
    .json({ transaction_id: transaction.transactionId, summary: result })
}
