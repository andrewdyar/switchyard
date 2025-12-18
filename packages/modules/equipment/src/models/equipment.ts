import { model } from "@switchyard/framework/utils"

const Equipment = model
  .define(
    {
      tableName: "equipment",
      name: "Equipment",
    },
    {
      id: model.id().primaryKey(),
      name: model.text().searchable(),
      type: model.text(), // 'refrigerator', 'freezer', 'handheld', 'robot'
      inventory_group_id: model.text().nullable(),
      swift_collector_id: model.number().nullable(),
      swift_device_id: model.number().nullable(),
      swift_sensor_id_temperature: model.number().nullable(),
      swift_sensor_id_humidity: model.number().nullable(),
      metadata: model.json().nullable(),
      is_active: model.boolean().default(true),
      deleted_at: model.dateTime().nullable(),
      created_at: model.dateTime().default(() => new Date()),
      updated_at: model.dateTime().default(() => new Date()),
    }
  )
  .indexes([
    {
      name: "IDX_equipment_type",
      on: ["type"],
      unique: false,
    },
    {
      name: "IDX_equipment_inventory_group",
      on: ["inventory_group_id"],
      unique: false,
      where: "inventory_group_id IS NOT NULL",
    },
    {
      name: "IDX_equipment_active",
      on: ["is_active"],
      unique: false,
      where: "is_active = true",
    },
  ])

export default Equipment
