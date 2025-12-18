/**
 * Alert Detection Service
 * 
 * Handles detection and creation of equipment alerts based on sensor readings
 */

import { Context } from "@switchyard/framework/types"
import { InjectManager, MedusaContext } from "@switchyard/framework/utils"
import { EquipmentAlert } from "../models"
import { AlertSeverity, AlertType } from "../types"

interface ThresholdConfig {
  low_critical?: number | null
  low_warning?: number | null
  high_warning?: number | null
  high_critical?: number | null
}

interface SensorReading {
  value: number
  recorded_at: Date
}

type InjectedDependencies = {
  baseRepository: any
  logger?: any
}

export default class AlertDetectionService {
  protected readonly baseRepository_: any
  protected readonly logger_?: any

  constructor({ baseRepository, logger }: InjectedDependencies) {
    this.baseRepository_ = baseRepository
    this.logger_ = logger
  }

  @InjectManager("baseRepository_")
  async checkThresholds(
    equipmentId: string,
    measurementType: "temperature" | "humidity",
    reading: SensorReading,
    threshold: ThresholdConfig,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    const alertRepo = this.baseRepository_.for(EquipmentAlert, context.manager)

    // Check for threshold violations
    let alertType: AlertType | null = null
    let severity: AlertSeverity | null = null
    let message: string | null = null

    const { value } = reading

    if (threshold.low_critical !== null && threshold.low_critical !== undefined && value < threshold.low_critical) {
      alertType = `${measurementType}_low` as AlertType
      severity = "critical"
      message = `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} critically low: ${value} (threshold: ${threshold.low_critical})`
    } else if (threshold.low_warning !== null && threshold.low_warning !== undefined && value < threshold.low_warning) {
      alertType = `${measurementType}_low` as AlertType
      severity = "warning"
      message = `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} low warning: ${value} (threshold: ${threshold.low_warning})`
    } else if (threshold.high_critical !== null && threshold.high_critical !== undefined && value > threshold.high_critical) {
      alertType = `${measurementType}_high` as AlertType
      severity = "critical"
      message = `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} critically high: ${value} (threshold: ${threshold.high_critical})`
    } else if (threshold.high_warning !== null && threshold.high_warning !== undefined && value > threshold.high_warning) {
      alertType = `${measurementType}_high` as AlertType
      severity = "warning"
      message = `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} high warning: ${value} (threshold: ${threshold.high_warning})`
    }

    if (alertType && severity) {
      // Check if there's already an active alert of this type
      const existingAlert = await alertRepo.findOne({
        where: {
          equipment_id: equipmentId,
          alert_type: alertType,
          status: "active",
          deleted_at: null,
        },
      })

      if (!existingAlert) {
        // Create new alert
        const alert = alertRepo.create({
          equipment_id: equipmentId,
          alert_type: alertType,
          severity: severity,
          status: "active",
          current_value: value,
          threshold_value: threshold.low_critical || threshold.low_warning || threshold.high_warning || threshold.high_critical,
          message,
          triggered_at: new Date(),
        })

        await alertRepo.save(alert)

        this.logger_?.info(`Created ${severity} alert for equipment ${equipmentId}: ${alertType}`)
      }
    } else {
      // Reading is normal - resolve any active alerts of this type
      const activeAlerts = await alertRepo.find({
        where: {
          equipment_id: equipmentId,
          alert_type: [`${measurementType}_low`, `${measurementType}_high`],
          status: "active",
          deleted_at: null,
        },
      })

      for (const alert of activeAlerts) {
        alert.status = "resolved"
        alert.resolved_at = new Date()
        alert.resolved_reason = "Reading returned to normal range"
        await alertRepo.save(alert)

        this.logger_?.info(`Auto-resolved alert ${alert.id} for equipment ${equipmentId}`)
      }
    }
  }

  @InjectManager("baseRepository_")
  async checkConnectivity(
    equipmentId: string,
    lastReadingTime: Date | null,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    const alertRepo = this.baseRepository_.for(EquipmentAlert, context.manager)

    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

    const isOffline = !lastReadingTime || lastReadingTime < fifteenMinutesAgo

    if (isOffline) {
      // Check if there's already an active connectivity alert
      const existingAlert = await alertRepo.findOne({
        where: {
          equipment_id: equipmentId,
          alert_type: "connectivity_loss",
          status: "active",
          deleted_at: null,
        },
      })

      if (!existingAlert) {
        const alert = alertRepo.create({
          equipment_id: equipmentId,
          alert_type: "connectivity_loss" as AlertType,
          severity: "critical" as AlertSeverity,
          status: "active",
          message: `No readings received for more than 15 minutes. Last reading: ${lastReadingTime?.toISOString() || "Never"}`,
          triggered_at: new Date(),
        })

        await alertRepo.save(alert)

        this.logger_?.warn(`Created connectivity alert for equipment ${equipmentId}`)
      }
    } else {
      // Resolve any connectivity alerts
      const activeConnectivityAlerts = await alertRepo.find({
        where: {
          equipment_id: equipmentId,
          alert_type: "connectivity_loss",
          status: "active",
          deleted_at: null,
        },
      })

      for (const alert of activeConnectivityAlerts) {
        alert.status = "resolved"
        alert.resolved_at = new Date()
        alert.resolved_reason = "Connectivity restored"
        await alertRepo.save(alert)

        this.logger_?.info(`Resolved connectivity alert for equipment ${equipmentId}`)
      }
    }
  }
}
