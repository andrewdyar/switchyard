import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"

/**
 * GET /admin/equipment/alerts
 * List alerts with optional filters
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const alertsService = req.scope.resolve(EQUIPMENT_ALERTS_MODULE) as any

  const filters: Record<string, any> = {}

  if (req.query.equipment_id) {
    filters.equipment_id = req.query.equipment_id
  }

  if (req.query.status) {
    filters.status = req.query.status
  }

  if (req.query.alert_type) {
    filters.alert_type = req.query.alert_type
  }

  if (req.query.severity) {
    filters.severity = req.query.severity
  }

  try {
    const alerts = await alertsService.list(filters, {}, req.scope)

    res.json({ alerts })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to list alerts",
    })
  }
}
