import {
  CreateOrderReturnDTO,
  IOrderModuleService,
} from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"
import { StepResponse, createStep } from "@switchyard/framework/workflows-sdk"

export const createCompleteReturnStepId = "create-complete-return"
/**
 * This step creates a complete return.
 */
export const createCompleteReturnStep = createStep(
  createCompleteReturnStepId,
  async (data: CreateOrderReturnDTO, { container }) => {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    const orderReturn = await service.createReturn(data)
    return new StepResponse(orderReturn, data.order_id)
  },
  async (orderId, { container }) => {
    if (!orderId) {
      return
    }

    const service = container.resolve<IOrderModuleService>(Modules.ORDER)

    await service.revertLastVersion(orderId)
  }
)
