import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const EQUIPMENT_MODULE = "equipment"

/**
 * GET /admin/equipment/:id
 * Get equipment by ID
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    const equipment = await equipmentService.retrieve(id, req.scope)

    res.json({ equipment })
  } catch (error) {
    res.status(404).json({
      message: error instanceof Error ? error.message : "Equipment not found",
    })
  }
}

/**
 * PATCH /admin/equipment/:id
 * Update equipment
 */
export const PATCH = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    const equipment = await equipmentService.update(id, req.body, req.scope)

    res.json({ equipment })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update equipment",
    })
  }
}

/**
 * DELETE /admin/equipment/:id
 * Soft delete equipment
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    await equipmentService.delete(id, req.scope)

    res.status(200).json({ id, deleted: true })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete equipment",
    })
  }
}
