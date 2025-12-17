import { Logger } from "@switchyard/framework/types"
import { Context, MedusaContext } from "@switchyard/framework/utils"
import { SwiftSensorsAPIClient } from "@switchyard/providers-swift-sensors"
import { TemperatureReading } from "../models"

type InjectedDependencies = {
  baseRepository: any
  logger?: Logger
}

export class TemperatureSyncService {
  protected baseRepository_: any
  protected logger_?: Logger

  constructor(
    { baseRepository, logger }: InjectedDependencies,
    protected swiftSensorsClient_: SwiftSensorsAPIClient
  ) {
    this.baseRepository_ = baseRepository
    this.logger_ = logger
  }

  /**
   * Sync latest sensor readings from Swift Sensors API
   */
  async syncLatestReadings(
    accountId: string,
    equipmentMap: Map<number, { equipmentId: string; measurementType: "temperature" | "humidity" }>,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    try {
      const updates = await this.swiftSensorsClient_.getSensorUpdates(accountId)
      const readingRepo = this.getRepository(context, TemperatureReading)

      const now = new Date()

      for (const [sensorIdStr, data] of Object.entries(updates.sensorData)) {
        const sensorId = parseInt(sensorIdStr, 10)
        const [timestamp, value, thresholdStatus, lastNormalTime] = data

        const equipmentInfo = equipmentMap.get(sensorId)
        if (!equipmentInfo) {
          continue // Skip sensors not mapped to equipment
        }

        // Determine measurement type based on sensor mapping
        const { equipmentId, measurementType } = equipmentInfo

        // Convert timestamp (seconds) to Date
        const recordedAt = new Date(timestamp * 1000)

        // Determine unit based on measurement type
        const unit = measurementType === "temperature" ? "°F" : "%"

        // Create reading record
        const reading = readingRepo.create({
          id: this.generateId(),
          equipment_id: equipmentId,
          sensor_id: sensorId,
          measurement_type: measurementType,
          value: value,
          unit: unit,
          threshold_status: thresholdStatus,
          recorded_at: recordedAt,
          swift_timestamp: timestamp,
          created_at: now,
        })

        await readingRepo.save(reading)
      }

      this.logger_?.info(`Synced ${Object.keys(updates.sensorData).length} sensor readings`)
    } catch (error) {
      this.logger_?.error("Failed to sync latest readings", error)
      throw error
    }
  }

  /**
   * Sync historical data for a time range
   */
  async syncHistoricalData(
    accountId: string,
    sensorIds: number[],
    startTime: number,
    endTime: number,
    equipmentMap: Map<number, { equipmentId: string; measurementType: "temperature" | "humidity" }>,
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    try {
      const timeSeries = await this.swiftSensorsClient_.getSensorTimeSeries(accountId, {
        startTime,
        endTime,
        ids: sensorIds,
        timeUnitDesignation: "seconds",
        type: "samples",
      })

      const readingRepo = this.getRepository(context, TemperatureReading)

      for (const series of timeSeries.timeSeriesData) {
        const sensorId = series.id
        const equipmentInfo = equipmentMap.get(sensorId)
        if (!equipmentInfo) {
          continue
        }

        const { equipmentId, measurementType } = equipmentInfo
        const unit = measurementType === "temperature" ? "°F" : "%"

        for (const [timestamp, value] of series.samples) {
          const recordedAt = new Date(timestamp)

          // Check if reading already exists
          const existing = await readingRepo.findOne({
            where: {
              equipment_id: equipmentId,
              sensor_id: sensorId,
              recorded_at: recordedAt,
            },
          })

          if (!existing) {
            const reading = readingRepo.create({
              id: this.generateId(),
              equipment_id: equipmentId,
              sensor_id: sensorId,
              measurement_type: measurementType,
              value: value,
              unit: unit,
              threshold_status: null, // Historical data may not have threshold status
              recorded_at: recordedAt,
              swift_timestamp: Math.floor(timestamp / 1000),
              created_at: new Date(),
            })

            await readingRepo.save(reading)
          }
        }
      }

      this.logger_?.info(`Synced historical data for ${sensorIds.length} sensors`)
    } catch (error) {
      this.logger_?.error("Failed to sync historical data", error)
      throw error
    }
  }

  protected getRepository(context: Context, entity: any): any {
    return this.baseRepository_.for(entity, context.manager)
  }

  protected generateId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}
