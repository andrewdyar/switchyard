import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

// Module key matches the one defined in @switchyard/inventory-group joiner-config
const INVENTORY_GROUP_MODULE = "inventoryGroup"

/**
 * GET /admin/inventory-groups
 * List all inventory groups with optional filtering
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const inventoryGroupService = req.scope.resolve(INVENTORY_GROUP_MODULE) as any

  // Get validated query params
  const {
    include_descendants_tree,
    include_ancestors_tree,
    parent_group_id,
    type,
    zone_code,
    is_active,
    q,
    order,
  } = req.filterableFields as Record<string, any>

  // Build filters (only include valid database fields)
  const filters: Record<string, any> = {}

  // Handle parent_group_id filter - null means root level groups
  if (parent_group_id !== undefined) {
    filters.parent_group_id =
      parent_group_id === "null" ? null : parent_group_id
  }

  if (type) filters.type = type
  if (zone_code) filters.zone_code = zone_code
  if (is_active !== undefined) filters.is_active = is_active
  if (q) filters.q = q

  // Pass tree options
  if (include_descendants_tree) {
    filters.include_descendants_tree = include_descendants_tree
  }
  if (include_ancestors_tree) {
    filters.include_ancestors_tree = include_ancestors_tree
  }

  // Build order config - default to zone_code then name for sensible grouping
  const orderConfig: Record<string, string> = {}
  if (order) {
    const orderFields = order.split(",")
    orderFields.forEach((field: string) => {
      const trimmed = field.trim()
      if (trimmed.startsWith("-")) {
        orderConfig[trimmed.slice(1)] = "DESC"
      } else {
        orderConfig[trimmed] = "ASC"
      }
    })
  } else {
    // Default sorting: zone_code ASC, name ASC
    orderConfig.zone_code = "ASC"
    orderConfig.name = "ASC"
  }

  // Parse fields - it might be a string (comma-separated) or an array
  const fieldsArray: string[] = req.queryConfig.fields
    ? Array.isArray(req.queryConfig.fields)
      ? (req.queryConfig.fields as string[])
      : typeof req.queryConfig.fields === 'string'
      ? (req.queryConfig.fields as string).split(',').map((f: string) => f.trim())
      : []
    : []

  // Extract relations (fields starting with *)
  const relations = fieldsArray
    .filter((f: string) => f.startsWith('*'))
    .map((f: string) => f.slice(1))

  // Remove relation prefixes from fields array for select
  const selectFields = fieldsArray
    .filter((f: string) => !f.startsWith('*'))
    .concat(relations) // Relations are also included in select

  const [inventory_groups, count] = await inventoryGroupService.listAndCount(
    filters,
    {
      skip: req.queryConfig.pagination?.skip || 0,
      take: req.queryConfig.pagination?.take || 20,
      order: orderConfig,
      select: selectFields.length > 0 ? selectFields : undefined,
      relations: relations.length > 0 ? relations : undefined,
    }
  )

  // Transform level field back to type for consistency
  const transformedGroups = inventory_groups.map((group: any) => ({
    ...group,
    level: group.type, // Keep backward compatibility
  }))

  res.json({
    inventory_groups: transformedGroups,
    count,
    offset: req.queryConfig.pagination?.skip || 0,
    limit: req.queryConfig.pagination?.take || 20,
  })
}

/**
 * POST /admin/inventory-groups
 * Create a new inventory group
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const inventoryGroupService = req.scope.resolve(INVENTORY_GROUP_MODULE) as any

  const inventory_group = await inventoryGroupService.create(req.validatedBody)

  res.status(200).json({ inventory_group })
}

