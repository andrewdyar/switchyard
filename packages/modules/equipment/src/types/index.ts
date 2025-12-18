export interface CreateEquipmentDTO {
  name: string
  type: "refrigerator" | "freezer" | "handheld" | "robot"
  inventory_group_id?: string | null
  swift_collector_id?: number | null
  swift_device_id?: number | null
  swift_sensor_id_temperature?: number | null
  swift_sensor_id_humidity?: number | null
  metadata?: Record<string, unknown> | null
  is_active?: boolean
}

export interface UpdateEquipmentDTO {
  name?: string
  type?: "refrigerator" | "freezer" | "handheld" | "robot"
  inventory_group_id?: string | null
  swift_collector_id?: number | null
  swift_device_id?: number | null
  swift_sensor_id_temperature?: number | null
  swift_sensor_id_humidity?: number | null
  metadata?: Record<string, unknown> | null
  is_active?: boolean
}

export interface EquipmentDTO {
  id: string
  name: string
  type: string
  inventory_group_id: string | null
  swift_collector_id: number | null
  swift_device_id: number | null
  swift_sensor_id_temperature: number | null
  swift_sensor_id_humidity: number | null
  metadata: Record<string, unknown> | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateEquipmentThresholdDTO {
  equipment_id: string
  measurement_type: "temperature" | "humidity"
  low_critical?: number | null
  low_warning?: number | null
  high_warning?: number | null
  high_critical?: number | null
}

export interface UpdateEquipmentThresholdDTO {
  low_critical?: number | null
  low_warning?: number | null
  high_warning?: number | null
  high_critical?: number | null
}

export interface EquipmentThresholdDTO {
  id: string
  equipment_id: string
  measurement_type: string
  low_critical: number | null
  low_warning: number | null
  high_warning: number | null
  high_critical: number | null
  created_at: Date
  updated_at: Date
}
