import {
  CreateRefundReasonDTO,
  IPaymentModuleService,
} from "@switchyard/framework/types"
import { Modules } from "@switchyard/framework/utils"
import { StepResponse, createStep } from "@switchyard/framework/workflows-sdk"

/**
 * The refund reasons to create.
 */
export type CreateRefundReasonStepInput = CreateRefundReasonDTO[]

export const createRefundReasonStepId = "create-refund-reason"
/**
 * This step creates one or more refund reasons.
 */
export const createRefundReasonStep = createStep(
  createRefundReasonStepId,
  async (data: CreateRefundReasonStepInput, { container }) => {
    const service = container.resolve<IPaymentModuleService>(Modules.PAYMENT)

    const refundReasons = await service.createRefundReasons(data)

    return new StepResponse(
      refundReasons,
      refundReasons.map((rr) => rr.id)
    )
  },
  async (ids, { container }) => {
    if (!ids?.length) {
      return
    }

    const service = container.resolve<IPaymentModuleService>(Modules.PAYMENT)

    await service.deleteRefundReasons(ids)
  }
)
