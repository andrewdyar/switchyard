import { ModuleProviderService } from "./services/provider-service"
import { ModuleProvider } from "@switchyard/utils"

export * from "./services/provider-service"

export default ModuleProvider("provider-1", {
  services: [ModuleProviderService],
})
