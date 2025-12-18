import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const EQUIPMENT_NOTIFICATIONS_MODULE = "equipmentNotifications"

/**
 * PATCH /admin/equipment/notification-assignments/:id
 * Update notification assignment
 */
export const PATCH = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const notificationsService = req.scope.resolve(EQUIPMENT_NOTIFICATIONS_MODULE) as any

  try {
    const assignment = await notificationsService.update(id, req.body, req.scope)

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
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const notificationsService = req.scope.resolve(EQUIPMENT_NOTIFICATIONS_MODULE) as any

  try {
    await notificationsService.delete(id, req.scope)

    res.status(200).json({ id, deleted: true })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to delete notification assignment",
    })
  }
}
