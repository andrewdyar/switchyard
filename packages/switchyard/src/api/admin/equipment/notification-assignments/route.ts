import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

const EQUIPMENT_NOTIFICATIONS_MODULE = "equipmentNotifications"

/**
 * GET /admin/equipment/notification-assignments
 * List notification assignments
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const notificationsService = req.scope.resolve(EQUIPMENT_NOTIFICATIONS_MODULE) as any

  const filters: Record<string, any> = {}

  if (req.query.user_id) {
    filters.user_id = req.query.user_id
  }

  if (req.query.alert_type) {
    filters.alert_type = req.query.alert_type
  }

  if (req.query.equipment_id !== undefined) {
    filters.equipment_id = req.query.equipment_id === "null" ? null : req.query.equipment_id
  }

  try {
    const assignments = await notificationsService.list(filters, {}, req.context)

    res.json({ assignments })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to list notification assignments",
    })
  }
}

/**
 * POST /admin/equipment/notification-assignments
 * Create notification assignment
 */
export const POST = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const notificationsService = req.scope.resolve(EQUIPMENT_NOTIFICATIONS_MODULE) as any

  try {
    const assignment = await notificationsService.create(req.body, req.context)

    res.status(201).json({ assignment })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create notification assignment",
    })
  }
}
