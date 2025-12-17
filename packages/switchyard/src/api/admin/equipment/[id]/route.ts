import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

const EQUIPMENT_MODULE = "equipment"

/**
 * GET /admin/equipment/:id
 * Get equipment by ID
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    const equipment = await equipmentService.retrieve(id, req.context)

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
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    const equipment = await equipmentService.update(id, req.body, req.context)

    res.json({ equipment })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update equipment",
    })
  }
}

/**
 * DELETE /admin/equipment/:id
 * Delete equipment
 */
export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  try {
    await equipmentService.delete(id, req.context)

    res.status(204).send()
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete equipment",
    })
  }
}
