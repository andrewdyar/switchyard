import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { StoreReturnReasonParamsType } from "../validators"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: SwitchyardRequest<StoreReturnReasonParamsType>,
  res: SwitchyardResponse<HttpTypes.StoreReturnReasonResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const variables = { id: req.params.id }

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "return_reason",
    variables,
    fields: req.queryConfig.fields,
  })

  const [return_reason] = await remoteQuery(queryObject)

  res.json({ return_reason })
}
