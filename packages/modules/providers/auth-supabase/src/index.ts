import { ModuleProvider, Modules } from "@switchyard/framework/utils"
import { SupabaseAuthService } from "./services/supabase"

const services = [SupabaseAuthService]

export default ModuleProvider(Modules.AUTH, {
  services,
})


