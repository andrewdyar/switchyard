/**
 * Notification Service
 * 
 * Handles sending alert notifications to assigned users via multiple channels
 */

import { Context } from "@switchyard/framework/types"
import { InjectManager, MedusaContext } from "@switchyard/framework/utils"
import { AlertNotificationAssignment } from "../models"

type InjectedDependencies = {
  baseRepository: any
  logger?: any
}

interface AlertInfo {
  id: string
  equipment_id: string
  alert_type: string
  severity: string
  message: string | null
  current_value?: number | null
  threshold_value?: number | null
}

export default class NotificationService {
  protected readonly baseRepository_: any
  protected readonly logger_?: any

  constructor({ baseRepository, logger }: InjectedDependencies) {
    this.baseRepository_ = baseRepository
    this.logger_ = logger
  }

  @InjectManager("baseRepository_")
  async sendAlertNotifications(
    alert: AlertInfo,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    const assignmentRepo = this.baseRepository_.for(AlertNotificationAssignment, context.manager)

    // Find all active assignments for this alert type
    const assignments = await assignmentRepo.find({
      where: {
        alert_type: alert.alert_type,
        is_active: true,
        deleted_at: null,
      },
    })

    // Also check for equipment-specific assignments
    const equipmentAssignments = await assignmentRepo.find({
      where: {
        alert_type: alert.alert_type,
        equipment_id: alert.equipment_id,
        is_active: true,
        deleted_at: null,
      },
    })

    const allAssignments = [...assignments, ...equipmentAssignments]

    // Deduplicate by user_id
    const seenUsers = new Set<string>()
    const uniqueAssignments = allAssignments.filter((a) => {
      if (seenUsers.has(a.user_id)) return false
      seenUsers.add(a.user_id)
      return true
    })

    for (const assignment of uniqueAssignments) {
      const channels = assignment.notification_channels as string[]

      for (const channel of channels) {
        await this.sendNotification(channel, assignment.user_id, alert)
      }
    }

    this.logger_?.info(`Sent notifications to ${uniqueAssignments.length} users for alert ${alert.id}`)
  }

  protected async sendNotification(
    channel: string,
    userId: string,
    alert: AlertInfo
  ): Promise<void> {
    const message = this.formatAlertMessage(alert)

    switch (channel) {
      case "email":
        await this.sendEmailNotification(userId, alert, message)
        break
      case "sms":
        await this.sendSMSNotification(userId, alert, message)
        break
      case "in_app":
        await this.sendInAppNotification(userId, alert, message)
        break
      default:
        this.logger_?.warn(`Unknown notification channel: ${channel}`)
    }
  }

  protected formatAlertMessage(alert: AlertInfo): string {
    const typeLabel = alert.alert_type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())

    let message = `[${alert.severity.toUpperCase()}] ${typeLabel}`

    if (alert.message) {
      message += ` - ${alert.message}`
    }

    if (alert.current_value !== null && alert.current_value !== undefined) {
      message += ` (Current: ${alert.current_value})`
    }

    return message
  }

  protected async sendEmailNotification(
    userId: string,
    alert: AlertInfo,
    message: string
  ): Promise<void> {
    // TODO: Integrate with actual email service
    this.logger_?.info(`[EMAIL] Would send to user ${userId}: ${message}`)
  }

  protected async sendSMSNotification(
    userId: string,
    alert: AlertInfo,
    message: string
  ): Promise<void> {
    // TODO: Integrate with actual SMS service
    this.logger_?.info(`[SMS] Would send to user ${userId}: ${message}`)
  }

  protected async sendInAppNotification(
    userId: string,
    alert: AlertInfo,
    message: string
  ): Promise<void> {
    // TODO: Store in notifications table for in-app display
    this.logger_?.info(`[IN_APP] Would notify user ${userId}: ${message}`)
  }
}
