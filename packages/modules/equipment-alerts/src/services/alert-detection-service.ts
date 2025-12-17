import { Logger } from "@switchyard/framework/types"
import { Context, MedusaContext } from "@switchyard/framework/utils"
import { EquipmentAlertDTO } from "../types"
import { EquipmentAlert as AlertModel } from "../models"

type InjectedDependencies = {
  baseRepository: any
  logger?: Logger
}

export class AlertDetectionService {
  protected baseRepository_: any
  protected logger_?: Logger

  constructor({ baseRepository, logger }: InjectedDependencies) {
    this.baseRepository_ = baseRepository
    this.logger_ = logger
  }

  /**
   * Check temperature/humidity reading against thresholds and create alerts
   */
  async checkThresholds(
    equipmentId: string,
    measurementType: "temperature" | "humidity",
    value: number,
    thresholdStatus: number,
    thresholds: {
      low_critical?: number | null
      low_warning?: number | null
      high_warning?: number | null
      high_critical?: number | null
    },
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO | null> {
    const alertRepo = this.getRepository(context, AlertModel)

    // Check for existing active alert of same type
    const existingAlert = await alertRepo.findOne({
      where: {
        equipment_id: equipmentId,
        alert_type: this.getAlertType(measurementType, thresholdStatus),
        status: "active",
        deleted_at: null,
      },
    })

    // Threshold status from Swift Sensors:
    // 1 = NORMAL, 2 = LOW_WARNING, 3 = HIGH_WARNING, 4 = LOW_CRITICAL, 5 = HIGH_CRITICAL
    if (thresholdStatus === 1) {
      // Normal - resolve any active alerts
      if (existingAlert) {
        existingAlert.status = "resolved"
        existingAlert.resolved_at = new Date()
        await alertRepo.save(existingAlert)
      }
      return null
    }

    // Determine severity and alert type
    const severity = thresholdStatus >= 4 ? "critical" : "warning"
    const alertType = this.getAlertType(measurementType, thresholdStatus)

    // If alert already exists and is same severity, update it
    if (existingAlert && existingAlert.severity === severity) {
      existingAlert.current_value = value
      existingAlert.triggered_at = new Date()
      await alertRepo.save(existingAlert)
      return this.baseRepository_.serialize<EquipmentAlertDTO>(existingAlert)
    }

    // Create new alert or update existing one
    let alert: AlertModel
    if (existingAlert) {
      // Update severity if changed
      existingAlert.severity = severity
      existingAlert.current_value = value
      existingAlert.triggered_at = new Date()
      existingAlert.status = "active"
      alert = await alertRepo.save(existingAlert)
    } else {
      // Create new alert
      alert = alertRepo.create({
        id: this.generateId(),
        equipment_id: equipmentId,
        alert_type: alertType,
        severity: severity,
        status: "active",
        current_value: value,
        threshold_value: this.getThresholdValue(thresholdStatus, thresholds),
        message: this.generateAlertMessage(measurementType, thresholdStatus, value, thresholds),
        triggered_at: new Date(),
        created_at: new Date(),
      })

      alert = await alertRepo.save(alert)
    }

    this.logger_?.info(`Created/updated alert for equipment ${equipmentId}: ${alertType} (${severity})`)

    return this.baseRepository_.serialize<EquipmentAlertDTO>(alert)
  }

  /**
   * Check for connectivity loss (no readings for > 15 minutes)
   */
  async checkConnectivity(
    equipmentId: string,
    lastReadingTime: Date | null,
    @MedusaContext() context: Context = {}
  ): Promise<EquipmentAlertDTO | null> {
    const alertRepo = this.getRepository(context, AlertModel)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

    if (!lastReadingTime || lastReadingTime < fifteenMinutesAgo) {
      // Check for existing connectivity alert
      const existingAlert = await alertRepo.findOne({
        where: {
          equipment_id: equipmentId,
          alert_type: "connectivity_loss",
          status: "active",
          deleted_at: null,
        },
      })

      if (existingAlert) {
        return this.baseRepository_.serialize<EquipmentAlertDTO>(existingAlert)
      }

      // Create new connectivity alert
      const alert = alertRepo.create({
        id: this.generateId(),
        equipment_id: equipmentId,
        alert_type: "connectivity_loss",
        severity: "critical",
        status: "active",
        message: `No sensor readings received for equipment in the last 15 minutes. Last reading: ${lastReadingTime ? lastReadingTime.toISOString() : "never"}`,
        triggered_at: new Date(),
        created_at: new Date(),
      })

      const saved = await alertRepo.save(alert)
      return this.baseRepository_.serialize<EquipmentAlertDTO>(saved)
    }

    // Connectivity is good - resolve any active alerts
    const existingAlert = await alertRepo.findOne({
      where: {
        equipment_id: equipmentId,
        alert_type: "connectivity_loss",
        status: "active",
        deleted_at: null,
      },
    })

    if (existingAlert) {
      existingAlert.status = "resolved"
      existingAlert.resolved_at = new Date()
      await alertRepo.save(existingAlert)
    }

    return null
  }

  protected getAlertType(
    measurementType: "temperature" | "humidity",
    thresholdStatus: number
  ): AlertType {
    if (measurementType === "temperature") {
      return thresholdStatus >= 4 ? "temperature_high" : thresholdStatus === 3 ? "temperature_high" : thresholdStatus === 2 ? "temperature_low" : "temperature_low"
    } else {
      return thresholdStatus >= 4 ? "humidity_high" : thresholdStatus === 3 ? "humidity_high" : thresholdStatus === 2 ? "humidity_low" : "humidity_low"
    }
  }

  protected getThresholdValue(
    thresholdStatus: number,
    thresholds: {
      low_critical?: number | null
      low_warning?: number | null
      high_warning?: number | null
      high_critical?: number | null
    }
  ): number | null {
    switch (thresholdStatus) {
      case 2:
        return thresholds.low_warning || null
      case 3:
        return thresholds.high_warning || null
      case 4:
        return thresholds.low_critical || null
      case 5:
        return thresholds.high_critical || null
      default:
        return null
    }
  }

  protected generateAlertMessage(
    measurementType: "temperature" | "humidity",
    thresholdStatus: number,
    value: number,
    thresholds: {
      low_critical?: number | null
      low_warning?: number | null
      high_warning?: number | null
      high_critical?: number | null
    }
  ): string {
    const unit = measurementType === "temperature" ? "°F" : "%"
    const severity = thresholdStatus >= 4 ? "critical" : "warning"
    const direction = thresholdStatus >= 3 ? "high" : "low"

    return `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} is ${direction} (${value}${unit}). ${severity.toUpperCase()} threshold exceeded.`
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }

  protected generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}
