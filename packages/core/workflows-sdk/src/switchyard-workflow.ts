import { LocalWorkflow } from "@switchyard/orchestration"
import { LoadedModule, SwitchyardContainer } from "@switchyard/types"
import { ExportedWorkflow } from "./helper"

class SwitchyardWorkflow {
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
    if (workflowId in SwitchyardWorkflow.workflows) {
      return
    }

    SwitchyardWorkflow.workflows[workflowId] = exportedWorkflow
  }

  static unregisterWorkflow(workflowId) {
    delete SwitchyardWorkflow.workflows[workflowId]
  }

  static getWorkflow(workflowId): ExportedWorkflow {
    return SwitchyardWorkflow.workflows[workflowId] as unknown as ExportedWorkflow
  }
}

global.SwitchyardWorkflow ??= SwitchyardWorkflow
const GlobalSwitchyardWorkflow = global.SwitchyardWorkflow

export { GlobalSwitchyardWorkflow as SwitchyardWorkflow }
