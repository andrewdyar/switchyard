import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"

import { createInventoryLevelsWorkflow } from "@switchyard/core-flows"
import { refetchInventoryItem } from "../../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const POST = async (
  req: SwitchyardRequest<
    HttpTypes.AdminBatchCreateInventoryItemLocationLevels,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminInventoryItemResponse>
) => {
  const { id } = req.params

  const workflow = createInventoryLevelsWorkflow(req.scope)
  await workflow.run({
    input: {
      inventory_levels: [
        {
          ...req.validatedBody,
          inventory_item_id: id,
        },
      ],
    },
  })

  const inventoryItem = await refetchInventoryItem(
    id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ inventory_item: inventoryItem })
}

export const GET = async (
  req: SwitchyardRequest<HttpTypes.AdminInventoryLevelFilters>,
  res: SwitchyardResponse<HttpTypes.AdminInventoryLevelListResponse>
) => {
  const { id } = req.params

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const query = remoteQueryObjectFromString({
    entryPoint: "inventory_levels",
    variables: {
      filters: { ...req.filterableFields, inventory_item_id: id },
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: inventory_levels, metadata } = await remoteQuery(query)

  res.status(200).json({
    inventory_levels,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
