import { ChangeActionType, SwitchyardError } from "@switchyard/framework/utils"
import { OrderChangeProcessing } from "../calculate-order-change"

OrderChangeProcessing.registerActionType(ChangeActionType.PROMOTION_ADD, {
  operation({ action, currentOrder, options }) {
    // no-op
  },
  validate({ action }) {
    if (!action.reference_id) {
      throw new SwitchyardError(
        SwitchyardError.Types.INVALID_DATA,
        "Reference ID is required."
      )
    }
  },
})
