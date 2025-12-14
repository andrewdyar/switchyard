import { LocalWorkflow } from "@switchyard/orchestration"
import { LoadedModule, SwitchyardContainer } from "@switchyard/types"
import { ExportedWorkflow } from "./helper"

class MedusaWorkflow {
  static workflows: Record<
    string,
    (
      container?: LoadedModule[] | SwitchyardContainer
    ) => Omit<
      LocalWorkflow,
      "run" | "registerStepSuccess" | "registerStepFailure" | "cancel"
    > &
      ExportedWorkflow
  > = {}

  static registerWorkflow(workflowId, exportedWorkflow) {
    if (workflowId in MedusaWorkflow.workflows) {
      return
    }

    MedusaWorkflow.workflows[workflowId] = exportedWorkflow
  }

  static unregisterWorkflow(workflowId) {
    delete MedusaWorkflow.workflows[workflowId]
  }

  static getWorkflow(workflowId): ExportedWorkflow {
    return MedusaWorkflow.workflows[workflowId] as unknown as ExportedWorkflow
  }
}

global.MedusaWorkflow ??= MedusaWorkflow
const GlobalMedusaWorkflow = global.MedusaWorkflow

export { GlobalMedusaWorkflow as MedusaWorkflow }
