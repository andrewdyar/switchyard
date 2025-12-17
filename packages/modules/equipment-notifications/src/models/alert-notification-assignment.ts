import { model } from "@switchyard/framework/utils"

const AlertNotificationAssignment = model
  .define(
    {
      tableName: "alert_notification_assignments",
      name: "AlertNotificationAssignment",
    },
    {
      id: model.id().primaryKey(),
      user_id: model.text(),
      alert_type: model.text(), // Alert type from equipment_alerts
      notification_channels: model.array(model.text()), // ['email', 'sms', 'in_app']
      equipment_id: model.text().nullable(), // NULL = all equipment
      is_active: model.boolean().default(true),
      created_at: model.dateTime().default(() => new Date()),
      updated_at: model.dateTime().default(() => new Date()),
    }
  )
  .indexes([
    {
      name: "IDX_alert_notifications_user",
      on: ["user_id"],
      unique: false,
    },
    {
      name: "IDX_alert_notifications_type",
      on: ["alert_type"],
      unique: false,
    },
    {
      name: "IDX_alert_notifications_equipment",
      on: ["equipment_id"],
      unique: false,
      where: "equipment_id IS NOT NULL",
    },
  ])

export default AlertNotificationAssignment
