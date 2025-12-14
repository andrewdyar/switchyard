import {
  ContainerRegistrationKeys,
  SwitchyardError,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: SwitchyardRequest<HttpTypes.SelectParams>,
  res: SwitchyardResponse<HttpTypes.StoreRegionResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "region",
    variables: {
      filters: { id: req.params.id },
    },
    fields: req.queryConfig.fields,
  })

  const [region] = await remoteQuery(queryObject)

  if (!region) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Region with id: ${req.params.id} was not found`
    )
  }

  res.status(200).json({ region })
}
