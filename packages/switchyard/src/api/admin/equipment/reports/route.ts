import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"

const TEMPERATURE_DATA_MODULE = "temperatureData"
const EQUIPMENT_ALERTS_MODULE = "equipmentAlerts"

/**
 * GET /admin/equipment/reports
 * Generate PDF or CSV report for equipment
 */
export const GET = async (
  req: AuthenticatedSwitchyardRequest,
  res: SwitchyardResponse
) => {
  const equipmentId = req.query.equipmentId as string
  const startTime = parseInt(req.query.startTime as string, 10)
  const endTime = parseInt(req.query.endTime as string, 10)
  const format = (req.query.format as "csv" | "pdf") || "pdf"

  if (!equipmentId || !startTime || !endTime) {
    return res.status(400).json({
      message: "equipmentId, startTime, and endTime are required",
    })
  }

  try {
    const temperatureService = req.scope.resolve(TEMPERATURE_DATA_MODULE) as any
    const alertsService = req.scope.resolve(EQUIPMENT_ALERTS_MODULE) as any

    // Get time series data
    const readings = await temperatureService.getTimeSeries(
      {
        equipmentId,
        startTime,
        endTime,
        measurementType: "both",
      },
      req.context
    )

    // Get alerts for the time period
    const alerts = await alertsService.list(
      {
        equipment_id: equipmentId,
      },
      {},
      req.context
    )

    const filteredAlerts = alerts.filter(
      (alert: any) =>
        new Date(alert.triggered_at).getTime() >= startTime &&
        new Date(alert.triggered_at).getTime() <= endTime
    )

    if (format === "csv") {
      // Generate CSV
      const csvRows = [
        ["Timestamp", "Measurement Type", "Value", "Unit", "Threshold Status"].join(","),
      ]

      readings.forEach((reading: any) => {
        csvRows.push(
          [
            new Date(reading.recorded_at).toISOString(),
            reading.measurement_type,
            reading.value,
            reading.unit,
            reading.threshold_status || "",
          ].join(",")
        )
      })

      const csv = csvRows.join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="equipment-${equipmentId}-${startTime}-${endTime}.csv"`
      )
      res.send(csv)
    } else {
      // Generate PDF
      // For now, return JSON - PDF generation can be added later with pdfkit or similar
      res.json({
        equipment_id: equipmentId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        readings: readings.slice(0, 100), // Limit for now
        alerts: filteredAlerts,
        summary: {
          total_readings: readings.length,
          temperature_readings: readings.filter((r: any) => r.measurement_type === "temperature").length,
          humidity_readings: readings.filter((r: any) => r.measurement_type === "humidity").length,
          alerts_count: filteredAlerts.length,
          critical_alerts: filteredAlerts.filter((a: any) => a.severity === "critical").length,
        },
      })
    }
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to generate report",
    })
  }
}
