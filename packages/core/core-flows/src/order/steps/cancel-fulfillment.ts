import {
  CancelOrderFulfillmentDTO,
  IOrderModuleService,
} from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"
import { StepResponse, createStep } from "@switchyard/framework/workflows-sdk"

export const cancelOrderFulfillmentStepId = "cancel-order-fulfillment"
/**
 * This step cancels an order's fulfillment.
 * 
 * @example
 * const data = cancelOrderFulfillmentStep({
 *   order_id: "order_123",
 *   items: [
 *     {
 *       id: "item_123",
 *       quantity: 1
 *     }
 *   ]
 * })
 */
export const cancelOrderFulfillmentStep = createStep(
  cancelOrderFulfillmentStepId,
  async (data: CancelOrderFulfillmentDTO, { container }) => {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    await service.cancelFulfillment(data)
    return new StepResponse(void 0, data.order_id)
  },
  async (orderId, { container }) => {
    if (!orderId) {
      return
    }

    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    await service.revertLastVersion(orderId)
  }
)
