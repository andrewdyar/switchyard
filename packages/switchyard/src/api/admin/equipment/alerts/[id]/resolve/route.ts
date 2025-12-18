import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"

/**
 * PATCH /admin/equipment/alerts/:id/resolve
 * Resolve an alert
 */
export const PATCH = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const alertsService = req.scope.resolve(EQUIPMENT_ALERTS_MODULE) as any

  try {
    const userId = req.auth_context?.actor_id || "system"
    const { reason } = req.body || {}

    const alert = await alertsService.resolve(id, userId, reason, req.scope)

    res.json({ alert })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to resolve alert",
    })
  }
}
