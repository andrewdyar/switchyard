import {
  MedusaContainer,
  PaymentCollectionDTO,
} from "@switchyard/framework/types"
import { refetchEntity } from "@switchyard/framework/http"

export const refetchPaymentCollection = async (
  id: string,
  scope: MedusaContainer,
  fields: string[]
): Promise<PaymentCollectionDTO> => {
  return refetchEntity({
    entity: "payment_collection",
    idOrFilter: id,
    scope,
    fields,
  })
}
