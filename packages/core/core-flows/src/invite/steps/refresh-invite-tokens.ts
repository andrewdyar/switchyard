import type { IUserModuleService } from "@switchyard/framework/types"
import { StepResponse, createStep } from "@switchyard/framework/workflows-sdk"

import { Modules } from "@switchyard/framework/utils"

/**
 * The IDs of the invites to refresh.
 */
export type RefreshInviteTokensStepInput = string[]

export const refreshInviteTokensStepId = "refresh-invite-tokens-step"
/**
 * This step refreshes the tokens of one or more invites.
 */
export const refreshInviteTokensStep = createStep(
  refreshInviteTokensStepId,
  async (input: RefreshInviteTokensStepInput, { container }) => {
    const service: IUserModuleService = container.resolve(Modules.USER)

    const invites = await service.refreshInviteTokens(input)

    return new StepResponse(invites)
  }
)
