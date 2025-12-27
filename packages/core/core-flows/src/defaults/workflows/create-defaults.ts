import {
  createWorkflow,
  WorkflowResponse,
} from "@switchyard/framework/workflows-sdk"
import { createDefaultSalesChannelStep } from "../../sales-channel"
import { createDefaultStoreStep } from "../steps/create-default-store"

export const createDefaultsWorkflowID = "create-defaults"
/**
 * This workflow creates default data for a Medusa application, including
 * a default sales channel and store. The Medusa application uses this workflow
 * to create the default data, if not existing, when the application is first started.
 * 
 * You can use this workflow within your customizations or your own custom workflows, allowing you to
 * create default data within your custom flows, such as seed scripts.
 * 
 * NOTE: For Goods/Switchyard, the SalesChannel and Store modules are disabled.
 * This workflow will gracefully skip these steps when the modules are not available.
 * Static defaults are used instead (see switchyard.config.ts STATIC_DEFAULTS).
 * 
 * @example
 * const { result } = await createDefaultsWorkflow(container)
 * .run()
 * 
 * @summary
 * 
 * Create default data for a Medusa application.
 */
export const createDefaultsWorkflow = createWorkflow(
  createDefaultsWorkflowID,
  () => {
    // Note: These steps check if their respective modules are available
    // and return undefined if not, allowing the workflow to complete gracefully
    const salesChannel = createDefaultSalesChannelStep({
      data: {
        name: "Default Sales Channel",
        description: "Created by Medusa",
      },
    })
    
    // Only create store if salesChannel was successfully created
    // If SalesChannel module is disabled, this will also be skipped
    const store = createDefaultStoreStep({
      store: {
        // Use optional chaining - if salesChannel is undefined, pass undefined
        default_sales_channel_id: salesChannel?.id,
      },
    })

    return new WorkflowResponse(store)
  }
)
