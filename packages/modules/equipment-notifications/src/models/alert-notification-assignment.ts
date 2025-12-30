import { model } from "@switchyard/framework/utils"

const AlertNotificationAssignment = model
  .define("AlertNotificationAssignment", {
    id: model.id({ prefix: "eqna" }).primaryKey(),
    user_id: model.text(),
    alert_type: model.text(), // 'temperature_high', 'temperature_low', etc.
    notification_channels: model.json(), // ['email', 'sms', 'in_app']
    equipment_id: model.text().nullable(), // NULL = all equipment
    is_active: model.boolean().default(true),
  })
  .indexes([
    {
      on: ["user_id"],
      unique: false,
    },
    {
      on: ["alert_type"],
      unique: false,
    },
    {
      on: ["user_id", "alert_type"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default AlertNotificationAssignment



