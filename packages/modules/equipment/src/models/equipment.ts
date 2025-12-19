import { model } from "@switchyard/framework/utils"

const Equipment = model
  .define("Equipment", {
    id: model.id({ prefix: "equip" }).primaryKey(),
    name: model.text().searchable(),
    type: model.text(), // 'refrigerator', 'freezer', 'handheld', 'robot'
    inventory_group_id: model.text().nullable(),
    swift_collector_id: model.number().nullable(),
    swift_device_id: model.number().nullable(),
    swift_sensor_id_temperature: model.number().nullable(),
    swift_sensor_id_humidity: model.number().nullable(),
    metadata: model.json().nullable(),
    is_active: model.boolean().default(true),
  })
  .indexes([
    {
      on: ["type"],
      unique: false,
    },
    {
      on: ["inventory_group_id"],
      unique: false,
      where: "deleted_at IS NULL AND inventory_group_id IS NOT NULL",
    },
    {
      on: ["is_active"],
      unique: false,
      where: "deleted_at IS NULL AND is_active = true",
    },
  ])

export default Equipment

