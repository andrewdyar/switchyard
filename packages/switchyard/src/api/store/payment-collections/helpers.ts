import {
  SwitchyardContainer,
  PaymentCollectionDTO,
} from "@switchyard/framework/types"
import { refetchEntity } from "@switchyard/framework/http"

export const refetchPaymentCollection = async (
  id: string,
  scope: SwitchyardContainer,
  fields: string[]
): Promise<PaymentCollectionDTO> => {
  return refetchEntity({
    entity: "payment_collection",
    idOrFilter: id,
    scope,
    fields,
  })
}
