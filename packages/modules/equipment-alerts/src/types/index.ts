export type AlertType =
  | "temperature_high"
  | "temperature_low"
  | "humidity_high"
  | "humidity_low"
  | "connectivity_loss"
  | "battery_low"
  | "sensor_offline"

export type AlertSeverity = "warning" | "critical"
export type AlertStatus = "active" | "acknowledged" | "resolved"

export interface CreateEquipmentAlertDTO {
  equipment_id: string
  alert_type: AlertType
  severity: AlertSeverity
  current_value?: number | null
  threshold_value?: number | null
  message?: string | null
}

export interface UpdateEquipmentAlertDTO {
  status?: AlertStatus
  resolved_reason?: string | null
}

export interface EquipmentAlertDTO {
  id: string
  equipment_id: string
  alert_type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  current_value: number | null
  threshold_value: number | null
  message: string | null
  resolved_at: Date | null
  resolved_by: string | null
  resolved_reason: string | null
  triggered_at: Date
  created_at: Date
}



