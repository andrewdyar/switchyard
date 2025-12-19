export type AlertType =
  | "temperature_high"
  | "temperature_low"
  | "humidity_high"
  | "humidity_low"
  | "connectivity_loss"
  | "battery_low"
  | "sensor_offline"

export type NotificationChannel = "email" | "sms" | "in_app"

export interface CreateAlertNotificationAssignmentDTO {
  user_id: string
  alert_type: AlertType
  notification_channels: NotificationChannel[]
  equipment_id?: string | null // NULL = all equipment
  is_active?: boolean
}

export interface UpdateAlertNotificationAssignmentDTO {
  notification_channels?: NotificationChannel[]
  equipment_id?: string | null
  is_active?: boolean
}

export interface AlertNotificationAssignmentDTO {
  id: string
  user_id: string
  alert_type: string
  notification_channels: NotificationChannel[]
  equipment_id: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

