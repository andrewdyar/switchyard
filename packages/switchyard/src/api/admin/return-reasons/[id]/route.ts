import {
  deleteReturnReasonsWorkflow,
  updateReturnReasonsWorkflow,
} from "@switchyard/core-flows"
import { AdminReturnReasonResponse, HttpTypes } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  SwitchyardError,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntity,
} from "@switchyard/framework/http"

export const GET = async (
  req: AuthenticatedSwitchyardRequest<HttpTypes.AdminReturnReasonParams>,
  res: SwitchyardResponse<AdminReturnReasonResponse>
) => {
  const return_reason = await refetchEntity({
    entity: "return_reason",
    idOrFilter: req.params.id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  if (!return_reason) {
    throw new SwitchyardError(
      SwitchyardError.Types.NOT_FOUND,
      `Return reason with id: ${req.params.id} was not found`
    )
  }

  res.json({ return_reason })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateReturnReason,
    HttpTypes.AdminReturnReasonParams
  >,
  res: SwitchyardResponse<AdminReturnReasonResponse>
) => {
  const workflow = updateReturnReasonsWorkflow(req.scope)

  const { id } = req.params
  const input = {
    selector: { id },
    update: req.validatedBody,
  }

  const { result } = await workflow.run({ input })

  const variables = { id: result[0].id }

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "return_reason",
    variables,
    fields: req.queryConfig.fields,
  })

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const [return_reason] = await remoteQuery(queryObject)

  res.json({ return_reason })
}

export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminReturnReasonDeleteResponse>
) => {
  const { id } = req.params

  const workflow = deleteReturnReasonsWorkflow(req.scope)

  const input = {
    ids: [id],
  }
  await workflow.run({ input })

  res.json({
    id,
    object: "return_reason",
    deleted: true,
  })
}
