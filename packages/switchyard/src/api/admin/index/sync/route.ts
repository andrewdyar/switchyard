import { AuthenticatedMedusaRequest, MedusaResponse } from "@switchyard/framework"
import { HttpTypes } from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"

/**
 * @since 2.11.2
 * @featureFlag index
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminIndexSyncPayload>,
  res: MedusaResponse
) => {
  const indexService = req.scope.resolve(Modules.INDEX)
  const strategy = req.validatedBody.strategy

  await indexService.sync({ strategy })

  res.send(200)
}
