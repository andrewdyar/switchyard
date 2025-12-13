import { batchInventoryItemLevelsWorkflow } from "@switchyard/core-flows"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/types"

export const POST = async (
  req: SwitchyardRequest<HttpTypes.AdminBatchInventoryItemsLocationLevels>,
  res: SwitchyardResponse<HttpTypes.AdminBatchInventoryItemsLocationLevelsResponse>
) => {
  const body = req.validatedBody

  const output = await batchInventoryItemLevelsWorkflow(req.scope).run({
    input: body,
  })

  res.json({
    created: output.result.created,
    updated: output.result.updated,
    deleted: output.result.deleted,
  })
}
