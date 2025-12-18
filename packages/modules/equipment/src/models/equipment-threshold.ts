import { model } from "@switchyard/framework/utils"

const EquipmentThreshold = model
  .define("EquipmentThreshold", {
    id: model.id({ prefix: "eqth" }).primaryKey(),
    equipment_id: model.text(),
    measurement_type: model.text(), // 'temperature', 'humidity'
    low_critical: model.number().nullable(),
    low_warning: model.number().nullable(),
    high_warning: model.number().nullable(),
    high_critical: model.number().nullable(),
  })
  .indexes([
    {
      on: ["equipment_id"],
      unique: false,
    },
    {
      on: ["equipment_id", "measurement_type"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default EquipmentThreshold
