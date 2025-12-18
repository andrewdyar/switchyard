import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const TEMPERATURE_DATA_MODULE = "temperatureData"
const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"
const EQUIPMENT_MODULE = "equipment"

/**
 * GET /admin/equipment/reports
 * Generate equipment report (CSV or PDF)
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const temperatureService = req.scope.resolve(TEMPERATURE_DATA_MODULE) as any
  const alertsService = req.scope.resolve(EQUIPMENT_ALERTS_MODULE) as any
  const equipmentService = req.scope.resolve(EQUIPMENT_MODULE) as any

  const equipmentId = req.query.equipmentId as string
  const startTime = parseInt(req.query.startTime as string, 10)
  const endTime = parseInt(req.query.endTime as string, 10)
  const format = (req.query.format as string) || "csv"

  if (!equipmentId || !startTime || !endTime) {
    return res.status(400).json({
      message: "Missing required parameters: equipmentId, startTime, endTime",
    })
  }

  try {
    // Get equipment info
    const equipment = await equipmentService.retrieve(equipmentId, req.scope)

    // Get time series data
    const readings = await temperatureService.getTimeSeries({
      equipmentId,
      startTime,
      endTime,
      measurementType: "both",
    }, req.scope)

    // Get alerts for the period
    const alerts = await alertsService.list({
      equipment_id: equipmentId,
    }, {}, req.scope)

    // Filter alerts by date range
    const filteredAlerts = alerts.filter((alert: any) => {
      const triggeredAt = new Date(alert.triggered_at).getTime()
      return triggeredAt >= startTime && triggeredAt <= endTime
    })

    if (format === "csv") {
      // Generate CSV
      const csvHeader = "timestamp,measurement_type,value,unit,threshold_status\n"
      const csvRows = readings.map((reading: any) =>
        `${new Date(reading.recorded_at).toISOString()},${reading.measurement_type},${reading.value},${reading.unit},${reading.threshold_status || ""}`
      ).join("\n")

      const csv = csvHeader + csvRows

      res.setHeader("Content-Type", "text/csv")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="equipment-${equipmentId}-report.csv"`
      )
      return res.send(csv)
    } else {
      // For PDF, return JSON for now (PDF generation would require additional library)
      const temperatureReadings = readings.filter((r: any) => r.measurement_type === "temperature")
      const humidityReadings = readings.filter((r: any) => r.measurement_type === "humidity")

      const report = {
        equipment,
        period: {
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
        },
        summary: {
          temperature: {
            min: temperatureReadings.length ? Math.min(...temperatureReadings.map((r: any) => r.value)) : null,
            max: temperatureReadings.length ? Math.max(...temperatureReadings.map((r: any) => r.value)) : null,
            avg: temperatureReadings.length 
              ? temperatureReadings.reduce((sum: number, r: any) => sum + r.value, 0) / temperatureReadings.length 
              : null,
            readings: temperatureReadings.length,
          },
          humidity: {
            min: humidityReadings.length ? Math.min(...humidityReadings.map((r: any) => r.value)) : null,
            max: humidityReadings.length ? Math.max(...humidityReadings.map((r: any) => r.value)) : null,
            avg: humidityReadings.length 
              ? humidityReadings.reduce((sum: number, r: any) => sum + r.value, 0) / humidityReadings.length 
              : null,
            readings: humidityReadings.length,
          },
        },
        alerts: {
          total: filteredAlerts.length,
          critical: filteredAlerts.filter((a: any) => a.severity === "critical").length,
          warning: filteredAlerts.filter((a: any) => a.severity === "warning").length,
          items: filteredAlerts,
        },
        readings,
      }

      res.json(report)
    }
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to generate report",
    })
  }
}
