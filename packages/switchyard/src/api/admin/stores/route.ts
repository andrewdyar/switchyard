import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminStoreListParams>,
  res: SwitchyardResponse<HttpTypes.AdminStoreListResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "store",
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: stores, metadata } = await remoteQuery(queryObject)
  res.json({
    stores,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
