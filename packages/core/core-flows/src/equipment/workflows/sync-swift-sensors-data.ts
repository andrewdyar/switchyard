import { createWorkflow } from "@switchyard/framework/workflows-sdk"
import { syncSwiftSensorsDataStep } from "../steps/sync-swift-sensors-data"

type WorkflowInput = {
  accountId?: string // Optional - will use env var if not provided
}

export const syncSwiftSensorsDataWorkflow = createWorkflow(
  "sync-swift-sensors-data",
  (input: WorkflowInput) => {
    const accountId = input.accountId || process.env.SWIFT_SENSORS_ACCOUNT_ID || ""
    if (!accountId) {
      throw new Error("SWIFT_SENSORS_ACCOUNT_ID is required")
    }
    return syncSwiftSensorsDataStep({ accountId })
  }
)
