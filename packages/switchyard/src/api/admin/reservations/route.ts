import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"

import { createReservationsWorkflow } from "@switchyard/core-flows"
import { refetchReservation } from "./helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminGetReservationsParams>,
  res: SwitchyardResponse<HttpTypes.AdminReservationListResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "reservation",
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: reservations, metadata } = await remoteQuery(queryObject)

  res.json({
    reservations,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreateReservation,
    HttpTypes.AdminReservationParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminReservationResponse>
) => {
  const input = [req.validatedBody]

  const { result } = await createReservationsWorkflow(req.scope).run({
    input: { reservations: input },
  })

  const reservation = await refetchReservation(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ reservation })
}
