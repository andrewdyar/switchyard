import { HttpTypes } from "@switchyard/framework/types"
import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import {
  SwitchyardError,
} from "@switchyard/framework/utils"
import { generateEntityColumns } from "./helpers"
import { ENTITY_MAPPINGS } from "./entity-mappings"

/**
 * @since 2.10.3
 * @featureFlag view_configurations
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse<HttpTypes.AdminViewsEntityColumnsResponse>
) => {
  const entity = req.params.entity

  const entityMapping = ENTITY_MAPPINGS[entity as keyof typeof ENTITY_MAPPINGS]
  if (!entityMapping) {
    return res.status(400).json({
      message: `Unsupported entity: ${entity}`,
      type: "invalid_data",
    } as any)
  }

  try {
    const columns = generateEntityColumns(entity, entityMapping)
    
    if (columns) {
      return res.json({
        columns,
      })
    }
  } catch (schemaError) {
    throw new SwitchyardError(
      SwitchyardError.Types.UNEXPECTED_STATE,
      `Schema introspection failed for entity: ${entity}. Please check if the entity exists in the schema.`
    )
  }

  return res.sendStatus(500)
}
