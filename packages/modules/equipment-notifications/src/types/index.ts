export interface CreateAlertNotificationAssignmentDTO {
  user_id: string
  alert_type: string
  notification_channels: string[] // ['email', 'sms', 'in_app']
  equipment_id?: string | null
}

export interface UpdateAlertNotificationAssignmentDTO {
  notification_channels?: string[]
  equipment_id?: string | null
  is_active?: boolean
}

export interface AlertNotificationAssignmentDTO {
  id: string
  user_id: string
  alert_type: string
  notification_channels: string[]
  equipment_id: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}
