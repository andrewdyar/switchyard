import { createStep, StepResponse } from "@switchyard/framework/workflows-sdk"
import { Modules } from "@switchyard/framework/utils"

type SyncSwiftSensorsDataStepInput = {
  accountId: string
}

export const syncSwiftSensorsDataStep = createStep(
  "sync-swift-sensors-data",
  async (input: SyncSwiftSensorsDataStepInput, { container }) => {
    const equipmentModuleService = container.resolve(Modules.EQUIPMENT || "equipment")
    const temperatureDataModuleService = container.resolve(
      Modules.TEMPERATURE_DATA || "temperatureData"
    )
    const alertsModuleService = container.resolve(Modules.EQUIPMENT_ALERTS || "equipmentAlerts")
    const logger = container.resolve("logger")

    try {
      // Get all active equipment with Swift Sensors IDs
      const equipment = await equipmentModuleService.list(
        { is_active: true },
        {},
        {}
      )

      // Build sensor ID to equipment mapping
      const sensorMap = new Map<
        number,
        { equipmentId: string; measurementType: "temperature" | "humidity" }
      >()

      equipment.forEach((eq: any) => {
        if (eq.swift_sensor_id_temperature) {
          sensorMap.set(eq.swift_sensor_id_temperature, {
            equipmentId: eq.id,
            measurementType: "temperature",
          })
        }
        if (eq.swift_sensor_id_humidity) {
          sensorMap.set(eq.swift_sensor_id_humidity, {
            equipmentId: eq.id,
            measurementType: "humidity",
          })
        }
      })

      if (sensorMap.size === 0) {
        logger.info("No equipment with Swift Sensors IDs found for sync")
        return new StepResponse({ synced: 0 }, { synced: 0 })
      }

      // Get sync service from temperature data module
      const syncService = temperatureDataModuleService.syncService_
      if (!syncService) {
        logger.warn("Swift Sensors sync service not available")
        return new StepResponse({ synced: 0 }, { synced: 0 })
      }

      // Sync latest readings
      await syncService.syncLatestReadings(input.accountId, sensorMap, {})

      // Get equipment with thresholds for alert checking
      for (const eq of equipment) {
        const thresholds = await equipmentModuleService.getThresholds(eq.id, {})

        const tempThreshold = thresholds.find((t: any) => t.measurement_type === "temperature")
        const humidityThreshold = thresholds.find((t: any) => t.measurement_type === "humidity")

        // Get latest readings for this equipment
        const latestTemp = await temperatureDataModuleService.getLatestReading(
          eq.id,
          "temperature",
          {}
        )
        const latestHumidity = await temperatureDataModuleService.getLatestReading(
          eq.id,
          "humidity",
          {}
        )

        const alertDetectionService = alertsModuleService.getAlertDetectionService()

        // Check temperature thresholds
        if (latestTemp && tempThreshold) {
          await alertDetectionService.checkThresholds(
            eq.id,
            "temperature",
            latestTemp.value,
            latestTemp.threshold_status || 1,
            {
              low_critical: tempThreshold.low_critical,
              low_warning: tempThreshold.low_warning,
              high_warning: tempThreshold.high_warning,
              high_critical: tempThreshold.high_critical,
            },
            {}
          )
        }

        // Check humidity thresholds
        if (latestHumidity && humidityThreshold) {
          await alertDetectionService.checkThresholds(
            eq.id,
            "humidity",
            latestHumidity.value,
            latestHumidity.threshold_status || 1,
            {
              low_critical: humidityThreshold.low_critical,
              low_warning: humidityThreshold.low_warning,
              high_warning: humidityThreshold.high_warning,
              high_critical: humidityThreshold.high_critical,
            },
            {}
          )
        }

        // Check connectivity
        const lastReadingTime = latestTemp
          ? new Date(latestTemp.recorded_at)
          : latestHumidity
          ? new Date(latestHumidity.recorded_at)
          : null
        await alertDetectionService.checkConnectivity(eq.id, lastReadingTime, {})
      }

      logger.info(`Synced Swift Sensors data for ${equipment.length} equipment units`)

      return new StepResponse({ synced: equipment.length }, { synced: equipment.length })
    } catch (error) {
      logger.error("Failed to sync Swift Sensors data", error)
      throw error
    }
  }
)
