import { model } from "@switchyard/framework/utils"

const TemperatureReading = model
  .define(
    {
      tableName: "temperature_readings",
      name: "TemperatureReading",
    },
    {
      id: model.id().primaryKey(),
      equipment_id: model.text(),
      sensor_id: model.number(),
      measurement_type: model.text(), // 'temperature', 'humidity'
      value: model.number(),
      unit: model.text(), // '°F', '°C', '%'
      threshold_status: model.number().nullable(), // 1=normal, 2-5=warning/critical
      recorded_at: model.dateTime(),
      swift_timestamp: model.number().nullable(), // Original timestamp from Swift Sensors
      created_at: model.dateTime().default(() => new Date()),
    }
  )
  .indexes([
    {
      name: "IDX_temperature_readings_equipment_recorded",
      on: ["equipment_id", "recorded_at"],
      unique: false,
    },
    {
      name: "IDX_temperature_readings_sensor_recorded",
      on: ["sensor_id", "recorded_at"],
      unique: false,
    },
    {
      name: "IDX_temperature_readings_type",
      on: ["equipment_id", "measurement_type", "recorded_at"],
      unique: false,
    },
  ])

export default TemperatureReading
