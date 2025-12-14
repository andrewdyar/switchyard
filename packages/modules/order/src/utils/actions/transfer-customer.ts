import { ChangeActionType, SwitchyardError } from "@switchyard/framework/utils"
import { OrderChangeProcessing } from "../calculate-order-change"
import { setActionReference } from "../set-action-reference"

OrderChangeProcessing.registerActionType(ChangeActionType.TRANSFER_CUSTOMER, {
  operation({ action, currentOrder, options }) {
    currentOrder.customer_id = action.reference_id

    setActionReference(currentOrder, action, options)
  },
  validate({ action }) {
    if (!action.reference_id) {
      throw new SwitchyardError(
        SwitchyardError.Types.INVALID_DATA,
        "Reference to customer ID is required"
      )
    }
  },
})
