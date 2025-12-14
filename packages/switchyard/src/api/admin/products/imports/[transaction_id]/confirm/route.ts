import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

import {
  importProductsAsChunksWorkflowId,
  waitConfirmationProductImportStepId,
} from "@switchyard/core-flows"
import { IWorkflowEngineService } from "@switchyard/framework/types"
import { Modules, TransactionHandlerType } from "@switchyard/framework/utils"
import { StepResponse } from "@switchyard/framework/workflows-sdk"

/**
 * @since 2.8.5
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const workflowEngineService: IWorkflowEngineService = req.scope.resolve(
    Modules.WORKFLOW_ENGINE
  )
  const transactionId = req.params.transaction_id

  await workflowEngineService.setStepSuccess({
    idempotencyKey: {
      action: TransactionHandlerType.INVOKE,
      transactionId,
      stepId: waitConfirmationProductImportStepId,
      workflowId: importProductsAsChunksWorkflowId,
    },
    stepResponse: new StepResponse(true),
  })

  res.status(202).json({})
}
