import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"

import {
  importProductsWorkflowId,
  waitConfirmationProductImportStepId,
} from "@switchyard/core-flows"
import { IWorkflowEngineService } from "@switchyard/framework/types"
import { Modules, TransactionHandlerType } from "@switchyard/framework/utils"
import { StepResponse } from "@switchyard/framework/workflows-sdk"

/**
 * @deprecated use `POST /admin/products/imports/:transaction_id/confirm` instead.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
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
      workflowId: importProductsWorkflowId,
    },
    stepResponse: new StepResponse(true),
  })

  res.status(202).json({})
}
