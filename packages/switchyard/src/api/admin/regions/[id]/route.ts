import {
  deleteRegionsWorkflow,
  updateRegionsWorkflow,
} from "@switchyard/core-flows"
import { SwitchyardError } from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { refetchRegion } from "../helpers"
import { HttpTypes } from "@switchyard/framework/types"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminRegionResponse>
) => {
  const region = await refetchRegion(
    req.params.id,
    req.scope,
    req.queryConfig.fields
  )

  if (!region) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Region with id: ${req.params.id} not found`
    )
  }

  res.status(200).json({ region })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateRegion,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminRegionResponse>
) => {
  const existingRegion = await refetchRegion(req.params.id, req.scope, ["id"])
  if (!existingRegion) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Region with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateRegionsWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
  })

  const region = await refetchRegion(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ region })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminRegionDeleteResponse>
) => {
  const id = req.params.id

  await deleteRegionsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "region",
    deleted: true,
  })
}
