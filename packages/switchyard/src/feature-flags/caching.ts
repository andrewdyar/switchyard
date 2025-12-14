import { FlagSettings } from "@switchyard/framework/feature-flags"

const CachingFeatureFlag: FlagSettings = {
  key: "caching",
  default_val: false,
  env_key: "SWITCHYARD_FF_CACHING",
  description: "[WIP] Enable core caching where applicable",
}

export default CachingFeatureFlag
