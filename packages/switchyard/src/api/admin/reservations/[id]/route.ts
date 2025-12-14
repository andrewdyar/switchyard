import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { SwitchyardError } from "@switchyard/framework/utils"
import {
  deleteReservationsWorkflow,
  updateReservationsWorkflow,
} from "@switchyard/core-flows"
import { refetchReservation } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminReservationParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminReservationResponse>
) => {
  const { id } = req.params

  const reservation = await refetchReservation(
    id,
    req.scope,
    req.queryConfig.fields
  )

  if (!reservation) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Reservation with id: ${id} was not found`
    )
  }

  res.status(200).json({ reservation })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateReservation,
    HttpTypes.AdminReservationParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminReservationResponse>
) => {
  const { id } = req.params
  await updateReservationsWorkflow(req.scope).run({
    input: {
      updates: [{ ...req.validatedBody, id }],
    },
  })

  const reservation = await refetchReservation(
    id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ reservation })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminReservationDeleteResponse>
) => {
  const id = req.params.id

  await deleteReservationsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "reservation",
    deleted: true,
  })
}
