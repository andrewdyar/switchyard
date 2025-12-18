import { model } from "@switchyard/framework/utils"

const EquipmentThreshold = model
  .define(
    {
      tableName: "equipment_thresholds",
      name: "EquipmentThreshold",
    },
    {
      id: model.id().primaryKey(),
      equipment_id: model.text(),
      measurement_type: model.text(), // 'temperature', 'humidity'
      low_critical: model.number().nullable(),
      low_warning: model.number().nullable(),
      high_warning: model.number().nullable(),
      high_critical: model.number().nullable(),
      deleted_at: model.dateTime().nullable(),
      created_at: model.dateTime().default(() => new Date()),
      updated_at: model.dateTime().default(() => new Date()),
    }
  )
  .indexes([
    {
      name: "IDX_equipment_threshold_equipment",
      on: ["equipment_id"],
      unique: false,
    },
    {
      name: "IDX_equipment_threshold_type",
      on: ["equipment_id", "measurement_type"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default EquipmentThreshold
