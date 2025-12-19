import { model } from "@switchyard/framework/utils"

const TemperatureReading = model
  .define("TemperatureReading", {
    id: model.id({ prefix: "temp" }).primaryKey(),
    equipment_id: model.text(),
    sensor_id: model.number(),
    measurement_type: model.text(), // 'temperature', 'humidity'
    value: model.number(),
    unit: model.text(), // '°F', '°C', '%'
    threshold_status: model.number().nullable(), // 1=normal, 2-5=warning/critical
    recorded_at: model.dateTime(),
    swift_timestamp: model.bigNumber().nullable(), // Original timestamp from Swift Sensors
  })
  .indexes([
    {
      on: ["equipment_id", "recorded_at"],
      unique: false,
    },
    {
      on: ["sensor_id", "recorded_at"],
      unique: false,
    },
    {
      on: ["equipment_id", "measurement_type", "recorded_at"],
      unique: false,
    },
  ])

export default TemperatureReading

