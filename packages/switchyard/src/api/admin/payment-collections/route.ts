import { createOrderPaymentCollectionWorkflow } from "@switchyard/core-flows"
import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
  refetchEntity,
} from "@switchyard/framework/http"

export const POST = async (
  req: AuthenticatedSwitchyardRequest<
    HttpTypes.AdminCreatePaymentCollection,
    HttpTypes.SelectParams
  >,
  res: SwitchyardResponse<HttpTypes.AdminPaymentCollectionResponse>
) => {
  const { result } = await createOrderPaymentCollectionWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  const paymentCollection = await refetchEntity({
    entity: "payment_collection",
    idOrFilter: result[0].id,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({ payment_collection: paymentCollection })
}
