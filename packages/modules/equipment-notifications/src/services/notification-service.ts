import { Logger } from "@switchyard/framework/types"
import { Context, MedusaContext, Modules } from "@switchyard/framework/utils"
import { AlertNotificationAssignment as AssignmentModel } from "../models"
import { AlertNotificationAssignmentDTO } from "../types"
import { EquipmentAlertDTO } from "@switchyard/equipment-alerts"

type InjectedDependencies = {
  baseRepository: any
  logger?: Logger
  [Modules.NOTIFICATION]?: any
  [Modules.USER]?: any
}

export class NotificationService {
  protected baseRepository_: any
  protected logger_?: Logger
  protected notificationModuleService_?: any
  protected userModuleService_?: any

  constructor({
    baseRepository,
    logger,
    [Modules.NOTIFICATION]: notificationModuleService,
    [Modules.USER]: userModuleService,
  }: InjectedDependencies) {
    this.baseRepository_ = baseRepository
    this.logger_ = logger
    this.notificationModuleService_ = notificationModuleService
    this.userModuleService_ = userModuleService
  }

  /**
   * Send notifications for an alert to all assigned users
   */
  async sendAlertNotifications(
    alert: EquipmentAlertDTO,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    try {
      const assignmentRepo = this.getRepository(context, AssignmentModel)

      // Find all active assignments for this alert type
      const assignments = await assignmentRepo.find({
        where: {
          alert_type: alert.alert_type,
          is_active: true,
          deleted_at: null,
          $or: [
            { equipment_id: alert.equipment_id },
            { equipment_id: null }, // Global assignment
          ],
        },
      })

      if (!assignments || assignments.length === 0) {
        this.logger_?.info(`No notification assignments found for alert type: ${alert.alert_type}`)
        return
      }

      // Get user details for each assignment
      const userIds = [...new Set(assignments.map((a) => a.user_id))]
      const users = await Promise.all(
        userIds.map((userId) =>
          this.userModuleService_?.retrieve(userId, context).catch(() => null)
        )
      )

      const userMap = new Map(users.filter(Boolean).map((u) => [u.id, u]))

      // Send notifications for each assignment
      for (const assignment of assignments) {
        const user = userMap.get(assignment.user_id)
        if (!user) {
          continue
        }

        const channels = assignment.notification_channels || []

        // Send email notification
        if (channels.includes("email") && user.email) {
          await this.sendEmailNotification(alert, user.email, user)
        }

        // Send SMS notification (if provider available)
        if (channels.includes("sms") && user.phone) {
          await this.sendSmsNotification(alert, user.phone, user)
        }

        // Create in-app notification
        if (channels.includes("in_app")) {
          await this.createInAppNotification(alert, user.id, context)
        }
      }

      this.logger_?.info(
        `Sent notifications for alert ${alert.id} to ${assignments.length} users`
      )
    } catch (error) {
      this.logger_?.error("Failed to send alert notifications", error)
      throw error
    }
  }

  protected async sendEmailNotification(
    alert: EquipmentAlertDTO,
    email: string,
    user: any
  ): Promise<void> {
    if (!this.notificationModuleService_) {
      this.logger_?.warn("Notification module service not available")
      return
    }

    try {
      await this.notificationModuleService_.createNotifications([
        {
          to: email,
          channel: "email",
          template: "equipment-alert",
          trigger_type: "equipment.alert",
          resource_id: alert.id,
          resource_type: "equipment_alert",
          receiver_id: user.id,
          data: {
            alert_type: alert.alert_type,
            severity: alert.severity,
            equipment_id: alert.equipment_id,
            current_value: alert.current_value,
            threshold_value: alert.threshold_value,
            message: alert.message,
            triggered_at: alert.triggered_at,
          },
        },
      ])
    } catch (error) {
      this.logger_?.error(`Failed to send email notification to ${email}`, error)
    }
  }

  protected async sendSmsNotification(
    alert: EquipmentAlertDTO,
    phone: string,
    user: any
  ): Promise<void> {
    if (!this.notificationModuleService_) {
      this.logger_?.warn("Notification module service not available for SMS")
      return
    }

    try {
      await this.notificationModuleService_.createNotifications([
        {
          to: phone,
          channel: "sms",
          template: "equipment-alert",
          trigger_type: "equipment.alert",
          resource_id: alert.id,
          resource_type: "equipment_alert",
          receiver_id: user.id,
          data: {
            alert_type: alert.alert_type,
            severity: alert.severity,
            equipment_id: alert.equipment_id,
            message: alert.message,
          },
        },
      ])
    } catch (error) {
      this.logger_?.error(`Failed to send SMS notification to ${phone}`, error)
    }
  }

  protected async createInAppNotification(
    alert: EquipmentAlertDTO,
    userId: string,
    context: Context
  ): Promise<void> {
    if (!this.notificationModuleService_) {
      return
    }

    try {
      await this.notificationModuleService_.createNotifications(
        [
          {
            to: userId,
            channel: "in_app",
            template: "equipment-alert",
            trigger_type: "equipment.alert",
            resource_id: alert.id,
            resource_type: "equipment_alert",
            receiver_id: userId,
            data: {
              alert_type: alert.alert_type,
              severity: alert.severity,
              equipment_id: alert.equipment_id,
              message: alert.message,
            },
          },
        ],
        context
      )
    } catch (error) {
      this.logger_?.error(`Failed to create in-app notification for user ${userId}`, error)
    }
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }
}
