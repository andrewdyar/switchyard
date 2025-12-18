import { model } from "@switchyard/framework/utils"

const EquipmentAlert = model
  .define("EquipmentAlert", {
    id: model.id({ prefix: "eqal" }).primaryKey(),
    equipment_id: model.text(),
    alert_type: model.text(), // 'temperature_high', 'temperature_low', 'humidity_high', 'humidity_low', 'connectivity_loss', 'battery_low', 'sensor_offline'
    severity: model.text(), // 'warning', 'critical'
    status: model.text().default("active"), // 'active', 'resolved', 'acknowledged'
    current_value: model.number().nullable(),
    threshold_value: model.number().nullable(),
    message: model.text().nullable(),
    resolved_at: model.dateTime().nullable(),
    resolved_by: model.text().nullable(), // user ID
    resolved_reason: model.text().nullable(),
    triggered_at: model.dateTime(),
  })
  .indexes([
    {
      on: ["equipment_id"],
      unique: false,
    },
    {
      on: ["status"],
      unique: false,
    },
    {
      on: ["alert_type"],
      unique: false,
    },
    {
      on: ["triggered_at"],
      unique: false,
    },
  ])

export default EquipmentAlert
