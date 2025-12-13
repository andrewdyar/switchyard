import type { IFulfillmentModuleService } from "@switchyard/framework/types"
import { SwitchyardError, Modules } from "@switchyard/framework/utils"
import { StepResponse, createStep } from "@switchyard/framework/workflows-sdk"

/**
 * The ID of the shipment to validate.
 */
export type ValidateShipmentStepInput = string

export const validateShipmentStepId = "validate-shipment"
/**
 * This step validates that a shipment can be created for a fulfillment.
 * If the shipment has already been created, the fulfillment has been canceled,
 * or the fulfillment does not have a shipping option, the step throws an error.
 */
export const validateShipmentStep = createStep(
  validateShipmentStepId,
  async (id: ValidateShipmentStepInput, { container }) => {
    const service = container.resolve<IFulfillmentModuleService>(
      Modules.FULFILLMENT
    )
    const fulfillment = await service.retrieveFulfillment(id, {
      select: ["shipped_at", "canceled_at", "shipping_option_id"],
    })

    if (fulfillment.shipped_at) {
      throw new SwitchyardError(
        SwitchyardError.Types.NOT_ALLOWED,
        "Shipment has already been created"
      )
    }

    if (fulfillment.canceled_at) {
      throw new SwitchyardError(
        SwitchyardError.Types.NOT_ALLOWED,
        "Cannot create shipment for a canceled fulfillment"
      )
    }

    if (!fulfillment.shipping_option_id) {
      throw new SwitchyardError(
        SwitchyardError.Types.NOT_ALLOWED,
        "Cannot create shipment without a Shipping Option"
      )
    }

    return new StepResponse(void 0)
  }
)
