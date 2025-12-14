import { linkSalesChannelsToApiKeyWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"
import { ApiKeyType, SwitchyardError } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchApiKey } from "../../helpers"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminBatchLink,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminApiKeyResponse>
) => {
  const { add, remove } = req.validatedBody
  const apiKey = await refetchApiKey(req.params.id, req.scope, ["id", "type"])

  if (apiKey.type !== ApiKeyType.PUBLISHABLE) {
    throw new SwitchyardError(
      SwitchyardError.Types.INVALID_DATA,
      "Sales channels can only be associated with publishable API keys"
    )
  }

  await linkSalesChannelsToApiKeyWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      add,
      remove,
    },
  })

  const updatedApiKey = await refetchApiKey(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ api_key: updatedApiKey })
}
