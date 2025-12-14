import { HttpTypes } from "@switchyard/types"

export const LOYALTY_PLUGIN_NAME = "@switchyard/loyalty-plugin"

export const getLoyaltyPlugin = (plugins: HttpTypes.AdminPlugin[]) => {
  return plugins?.find((plugin) => plugin.name === LOYALTY_PLUGIN_NAME)
}
