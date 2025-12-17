import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"

/**
 * PATCH /admin/equipment/alerts/:id/resolve
 * Resolve an alert
 */
export const PATCH = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params
  const alertsService = req.scope.resolve(EQUIPMENT_ALERTS_MODULE) as any

  try {
    const userId = req.auth_context?.actor_id

    const alert = await alertsService.update(id, {
      status: "resolved",
      resolved_at: new Date(),
      resolved_by: userId,
      resolved_reason: req.body.reason || null,
    }, req.context)

    res.json({ alert })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to resolve alert",
    })
  }
}
