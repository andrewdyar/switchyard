import * as entities from "./src/models"
import { defineMikroOrmCliConfig, Modules } from "@switchyard/framework/utils"

export default defineMikroOrmCliConfig(Modules.PRICING, {
  entities: Object.values(entities),
})
