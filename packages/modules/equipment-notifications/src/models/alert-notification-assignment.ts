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
      alert_type: model.text(), // 'temperature_high', 'temperature_low', etc.
      notification_channels: model.array(), // ['email', 'sms', 'in_app']
      equipment_id: model.text().nullable(), // NULL = all equipment
      is_active: model.boolean().default(true),
      deleted_at: model.dateTime().nullable(),
      created_at: model.dateTime().default(() => new Date()),
      updated_at: model.dateTime().default(() => new Date()),
    }
  )
  .indexes([
    {
      name: "IDX_alert_assignment_user",
      on: ["user_id"],
      unique: false,
    },
    {
      name: "IDX_alert_assignment_type",
      on: ["alert_type"],
      unique: false,
    },
    {
      name: "IDX_alert_assignment_user_type",
      on: ["user_id", "alert_type"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default AlertNotificationAssignment
