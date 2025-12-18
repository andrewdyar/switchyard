import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const EQUIPMENT_MODULE = "equipment"

/**
 * GET /admin/equipment
 * List equipment with optional filters
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  const filters: Record<string, any> = {}

  if (req.query.type) {
    filters.type = req.query.type
  }

  if (req.query.is_active !== undefined) {
    filters.is_active = req.query.is_active === "true"
  }

  if (req.query.inventory_group_id) {
    filters.inventory_group_id = req.query.inventory_group_id
  }

  try {
    const equipment = await equipmentService.list(filters, {}, req.scope)

    res.json({ equipment })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to list equipment",
    })
  }
}

/**
 * POST /admin/equipment
 * Create new equipment
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    const equipment = await equipmentService.create(req.body, req.scope)

    res.status(201).json({ equipment })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create equipment",
    })
  }
}
