import { OrchestrationUtils } from "@switchyard/utils"
import { WorkflowData, WorkflowDataProperties } from "../type"

/**
 * Workflow response class encapsulates the return value of a workflow
 */
export class WorkflowResponse<
  TResult,
  const THooks extends readonly unknown[] = []
> {
  __type: typeof OrchestrationUtils.SymbolSwitchyardWorkflowResponse =
    OrchestrationUtils.SymbolSwitchyardWorkflowResponse

  constructor(
    public $result:
      | WorkflowData<TResult>
      | {
          [K in keyof TResult]:
            | WorkflowData<TResult[K]>
            | WorkflowDataProperties<TResult[K]>
            | TResult[K]
        },
    public options?: { hooks: THooks }
  ) {}
}
