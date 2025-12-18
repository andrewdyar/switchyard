import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"

/**
 * PATCH /admin/equipment/alerts/:id/acknowledge
 * Acknowledge an alert
 */
export const PATCH = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const alertsService = req.scope.resolve(EQUIPMENT_ALERTS_MODULE) as any

  try {
    const alert = await alertsService.acknowledge(id, req.scope)

    res.json({ alert })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to acknowledge alert",
    })
  }
}
