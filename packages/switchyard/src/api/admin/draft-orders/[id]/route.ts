import {
  getOrderDetailWorkflow,
  updateDraftOrderWorkflow,
  deleteDraftOrdersWorkflow,
} from "@switchyard/core-flows"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes } from "@switchyard/framework/types"
import { ContainerRegistrationKeys } from "@switchyard/framework/utils"

export const GET = async (
  req: SwitchyardRequest<HttpTypes.AdminDraftOrderParams>,
  res: SwitchyardResponse<HttpTypes.AdminDraftOrderResponse>
) => {
  const workflow = getOrderDetailWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: req.queryConfig.fields,
      order_id: req.params.id,
      version: req.validatedQuery.version as number,
      filters: {
        is_draft_order: true,
      },
    },
  })

  res.status(200).json({ draft_order: result as HttpTypes.AdminDraftOrder })
}

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminUpdateDraftOrder,
    HttpTypes.AdminDraftOrderParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminDraftOrderResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await updateDraftOrderWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      user_id: req.auth_context.actor_id,
      id: req.params.id,
    },
  })

  const result = await query.graph({
    entity: "order",
    filters: { id: req.params.id },
    fields: req.queryConfig.fields,
  })

  res
    .status(200)
    .json({ draft_order: result.data[0] as HttpTypes.AdminDraftOrder })
}

/**
 * @since 2.8.4
 */
export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params

  await deleteDraftOrdersWorkflow(req.scope).run({
    input: {
      order_ids: [id],
    },
  })

  res.status(200).json({
    id,
    object: "draft-order",
    deleted: true,
  })
}
