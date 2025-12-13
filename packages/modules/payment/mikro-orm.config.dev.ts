import * as entities from "./src/models"
import { defineMikroOrmCliConfig, Modules } from "@switchyard/framework/utils"

export default defineMikroOrmCliConfig(Modules.PAYMENT, {
  entities: Object.values(entities),
})
