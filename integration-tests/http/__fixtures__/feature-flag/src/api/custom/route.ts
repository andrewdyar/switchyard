import { MedusaRequest, MedusaResponse } from "@switchyard/framework/http"
import { defineFileConfig, FeatureFlag } from "@switchyard/utils"

defineFileConfig({
  isDisabled: () => !FeatureFlag.isFeatureEnabled("custom_ff"),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ message: "Custom GET" })
}
