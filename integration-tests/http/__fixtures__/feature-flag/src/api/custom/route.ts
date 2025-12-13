import { SwitchyardRequest, SwitchyardResponse } from "@switchyard/framework/http"
import { defineFileConfig, FeatureFlag } from "@switchyard/utils"

defineFileConfig({
  isDisabled: () => !FeatureFlag.isFeatureEnabled("custom_ff"),
})

export const GET = async (req: SwitchyardRequest, res: SwitchyardResponse) => {
  res.json({ message: "Custom GET" })
}
