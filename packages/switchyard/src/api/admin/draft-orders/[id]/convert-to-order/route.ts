import { convertDraftOrderWorkflow } from "@switchyard/core-flows"
import { MedusaRequest, MedusaResponse } from "@switchyard/framework/http"
import { ContainerRegistrationKeys } from "@switchyard/framework/utils"
import { HttpTypes } from "@switchyard/types"

export const POST = async (
  req: MedusaRequest<HttpTypes.AdminDraftOrderParams>, 
  res: MedusaResponse<HttpTypes.AdminOrderResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await convertDraftOrderWorkflow(req.scope).run({
    input: {
      id: req.params.id,
    },
  })

  const result = await query.graph({
    entity: "orders",
    filters: { id: req.params.id },
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ order: result.data[0] as HttpTypes.AdminOrder })
}
