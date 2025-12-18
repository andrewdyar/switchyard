export interface TemperatureReadingDTO {
  id: string
  equipment_id: string
  sensor_id: number
  measurement_type: "temperature" | "humidity"
  value: number
  unit: string
  threshold_status: number | null
  recorded_at: Date
  swift_timestamp: number | null
  created_at: Date
}

export interface TimeSeriesQueryParams {
  equipmentId: string
  startTime: number
  endTime: number
  measurementType?: "temperature" | "humidity" | "both"
  groupByMinutes?: number
}
