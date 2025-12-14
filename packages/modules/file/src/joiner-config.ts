import { defineJoinerConfig, Modules } from "@switchyard/framework/utils"

export const joinerConfig = defineJoinerConfig(Modules.FILE, {
  models: [{ name: "File" }],
})
