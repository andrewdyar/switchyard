import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const TEMPERATURE_DATA_MODULE = "temperatureData"

/**
 * GET /admin/equipment/:id/time-series
 * Get time series data for equipment
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const temperatureService = req.scope.resolve(TEMPERATURE_DATA_MODULE) as any

  const startTime = req.query.startTime 
    ? parseInt(req.query.startTime as string, 10) 
    : Date.now() - 24 * 60 * 60 * 1000
  const endTime = req.query.endTime 
    ? parseInt(req.query.endTime as string, 10) 
    : Date.now()
  const measurementType = req.query.measurementType as "temperature" | "humidity" | "both" | undefined

  try {
    const readings = await temperatureService.getTimeSeries({
      equipmentId: id,
      startTime,
      endTime,
      measurementType: measurementType || "both",
    }, req.scope)

    res.json({ readings })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to get time series data",
    })
  }
}
