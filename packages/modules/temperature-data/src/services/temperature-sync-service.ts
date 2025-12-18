/**
 * Temperature Sync Service
 * 
 * Handles syncing temperature data from Swift Sensors API to local database
 */

import { Context } from "@switchyard/framework/types"
import { InjectManager, MedusaContext } from "@switchyard/framework/utils"
import { SwiftSensorsAPIClient } from "@switchyard/providers-swift-sensors"
import { TemperatureReading } from "../models"

type InjectedDependencies = {
  baseRepository: any
  logger?: any
}

export default class TemperatureSyncService {
  protected readonly baseRepository_: any
  protected readonly logger_?: any
  protected swiftSensorsClient_?: SwiftSensorsAPIClient

  constructor({ baseRepository, logger }: InjectedDependencies) {
    this.baseRepository_ = baseRepository
    this.logger_ = logger
  }

  protected async getSwiftClient(): Promise<SwiftSensorsAPIClient> {
    if (!this.swiftSensorsClient_) {
      const apiKey = process.env.SWIFT_SENSORS_API_KEY
      const email = process.env.SWIFT_SENSORS_EMAIL
      const password = process.env.SWIFT_SENSORS_PASSWORD

      if (!apiKey || !email || !password) {
        throw new Error("Swift Sensors credentials not configured")
      }

      this.swiftSensorsClient_ = new SwiftSensorsAPIClient(
        { apiKey, email, password },
        { logger: this.logger_ }
      )
    }

    return this.swiftSensorsClient_
  }

  @InjectManager("baseRepository_")
  async syncLatestReadings(
    equipmentId: string,
    sensorId: number,
    measurementType: "temperature" | "humidity",
    @MedusaContext() context: Context = {}
  ): Promise<void> {
    try {
      const client = await this.getSwiftClient()
      const accountId = process.env.SWIFT_SENSORS_ACCOUNT_ID

      if (!accountId) {
        throw new Error("SWIFT_SENSORS_ACCOUNT_ID not configured")
      }

      // Get current sensor values
      const updates = await client.getSensorUpdates(accountId)

      const sensorData = updates.sensorData[String(sensorId)]
      if (!sensorData) {
        this.logger_?.warn(`No data for sensor ${sensorId}`)
        return
      }

      const [time, value, thresholdStatus] = sensorData

      // Store in database
      const readingRepo = this.baseRepository_.for(TemperatureReading, context.manager)

      // Check if reading already exists
      const existingReading = await readingRepo.findOne({
        where: {
          equipment_id: equipmentId,
          sensor_id: sensorId,
          recorded_at: new Date(time * 1000),
        },
      })

      if (!existingReading) {
        const reading = readingRepo.create({
          equipment_id: equipmentId,
          sensor_id: sensorId,
          measurement_type: measurementType,
          value: value,
          unit: measurementType === "temperature" ? "°F" : "%",
          threshold_status: thresholdStatus,
          recorded_at: new Date(time * 1000),
          swift_timestamp: time,
        })

        await readingRepo.save(reading)

        this.logger_?.info(`Synced reading for sensor ${sensorId}: ${value}`)
      }
    } catch (error) {
      this.logger_?.error(`Failed to sync sensor ${sensorId}`, error)
      throw error
    }
  }

  @InjectManager("baseRepository_")
  async syncHistoricalData(
    equipmentId: string,
    sensorId: number,
    measurementType: "temperature" | "humidity",
    startTime: number,
    endTime: number,
    @MedusaContext() context: Context = {}
  ): Promise<number> {
    try {
      const client = await this.getSwiftClient()
      const accountId = process.env.SWIFT_SENSORS_ACCOUNT_ID

      if (!accountId) {
        throw new Error("SWIFT_SENSORS_ACCOUNT_ID not configured")
      }

      // Get time series data
      const timeSeries = await client.getSensorTimeSeries(accountId, {
        ids: [sensorId],
        startTime,
        endTime,
        timeUnitDesignation: "milliseconds",
      })

      const readingRepo = this.baseRepository_.for(TemperatureReading, context.manager)

      let syncedCount = 0
      const unit = measurementType === "temperature" ? "°F" : "%"

      for (const series of timeSeries.timeSeriesData) {
        for (const sample of series.samples) {
          const recordedAt = new Date(sample.time)

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
              equipment_id: equipmentId,
              sensor_id: sensorId,
              measurement_type: measurementType,
              value: sample.value,
              unit: unit,
              threshold_status: null,
              recorded_at: recordedAt,
              swift_timestamp: Math.floor(sample.time / 1000),
            })

            await readingRepo.save(reading)
            syncedCount++
          }
        }
      }

      this.logger_?.info(`Synced ${syncedCount} historical readings for sensor ${sensorId}`)

      return syncedCount
    } catch (error) {
      this.logger_?.error(`Failed to sync historical data for sensor ${sensorId}`, error)
      throw error
    }
  }
}
