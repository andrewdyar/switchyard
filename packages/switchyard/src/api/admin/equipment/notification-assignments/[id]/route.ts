import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

const EQUIPMENT_NOTIFICATIONS_MODULE = "equipmentNotifications"

/**
 * PATCH /admin/equipment/notification-assignments/:id
 * Update notification assignment
 */
export const PATCH = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params
  const notificationsService = req.scope.resolve(EQUIPMENT_NOTIFICATIONS_MODULE) as any

  try {
    const assignment = await notificationsService.update(id, req.body, req.context)

    res.json({ assignment })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update notification assignment",
    })
  }
}

/**
 * DELETE /admin/equipment/notification-assignments/:id
 * Delete notification assignment
 */
export const DELETE = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const { id } = req.params
  const notificationsService = req.scope.resolve(EQUIPMENT_NOTIFICATIONS_MODULE) as any

  try {
    await notificationsService.delete(id, req.context)

    res.status(204).send()
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete notification assignment",
    })
  }
}
