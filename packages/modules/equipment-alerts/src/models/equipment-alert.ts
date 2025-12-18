import { model } from "@switchyard/framework/utils"

const EquipmentAlert = model
  .define(
    {
      tableName: "equipment_alerts",
      name: "EquipmentAlert",
    },
    {
      id: model.id().primaryKey(),
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
      deleted_at: model.dateTime().nullable(),
      created_at: model.dateTime().default(() => new Date()),
    }
  )
  .indexes([
    {
      name: "IDX_equipment_alerts_equipment",
      on: ["equipment_id"],
      unique: false,
    },
    {
      name: "IDX_equipment_alerts_status",
      on: ["status"],
      unique: false,
    },
    {
      name: "IDX_equipment_alerts_type",
      on: ["alert_type"],
      unique: false,
    },
    {
      name: "IDX_equipment_alerts_triggered",
      on: ["triggered_at"],
      unique: false,
    },
  ])

export default EquipmentAlert
