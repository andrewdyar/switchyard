import { ContainerLike } from "@switchyard/framework"
import { Logger } from "@switchyard/framework/types"
import { FlowCancelOptions } from "@switchyard/framework/workflows-sdk"

export type InitializeModuleInjectableDependencies = {
  logger?: Logger
}

export type WorkflowOrchestratorCancelOptions = Omit<
  FlowCancelOptions,
  "transaction" | "transactionId" | "container"
> & {
  transactionId: string
  container?: ContainerLike
}
