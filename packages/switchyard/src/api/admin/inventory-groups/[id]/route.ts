import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@switchyard/framework/http"
import { MedusaError } from "@switchyard/framework/utils"
import { retrieveInventoryGroupConfig } from "../query-config"

// Module key matches the one defined in @switchyard/inventory-group joiner-config
const INVENTORY_GROUP_MODULE = "inventoryGroup"

/**
 * GET /admin/inventory-groups/:id
 * Retrieve a single inventory group by ID
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const inventoryGroupService = req.scope.resolve(INVENTORY_GROUP_MODULE) as any

  const { include_descendants_tree, include_ancestors_tree } =
    req.filterableFields as Record<string, any>

  // Build filters for tree options
  const filters: Record<string, any> = { id }
  if (include_descendants_tree) {
    filters.include_descendants_tree = include_descendants_tree
  }
  if (include_ancestors_tree) {
    filters.include_ancestors_tree = include_ancestors_tree
  }

  // Parse fields - use defaults from query config if not specified
  const fieldsArray: string[] = req.queryConfig.fields
    ? Array.isArray(req.queryConfig.fields)
      ? (req.queryConfig.fields as string[])
      : typeof req.queryConfig.fields === 'string'
      ? (req.queryConfig.fields as string).split(',').map((f: string) => f.trim())
      : retrieveInventoryGroupConfig.defaults
    : retrieveInventoryGroupConfig.defaults

  // Extract relations (fields starting with *)
  const relations = fieldsArray
    .filter((f: string) => f.startsWith('*'))
    .map((f: string) => f.slice(1))

  // Remove relation prefixes from fields array for select
  const selectFields = fieldsArray
    .filter((f: string) => !f.startsWith('*'))
    .concat(relations) // Relations are also included in select

  try {
    const [groups] = await inventoryGroupService.listAndCount(filters, {
      take: 1,
      select: selectFields.length > 0 ? selectFields : undefined,
      relations: relations.length > 0 ? relations : undefined,
    })

    if (!groups || groups.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Inventory group with id: ${id} was not found`
      )
    }

    const inventory_group = groups[0]

    res.json({
      inventory_group: {
        ...inventory_group,
        level: inventory_group.type, // Backward compatibility
      },
    })
  } catch (error: any) {
    if (error.type === MedusaError.Types.NOT_FOUND) {
      throw error
    }
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Inventory group with id: ${id} was not found`
    )
  }
}

/**
 * POST /admin/inventory-groups/:id
 * Update an inventory group
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const inventoryGroupService = req.scope.resolve(INVENTORY_GROUP_MODULE) as any

  const inventory_group = await inventoryGroupService.update(
    id,
    req.validatedBody
  )

  res.status(200).json({ inventory_group })
}

/**
 * DELETE /admin/inventory-groups/:id
 * Delete an inventory group
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const inventoryGroupService = req.scope.resolve(INVENTORY_GROUP_MODULE) as any

  await inventoryGroupService.delete([id])

  res.status(200).json({
    id,
    object: "inventory_group",
    deleted: true,
  })
}

