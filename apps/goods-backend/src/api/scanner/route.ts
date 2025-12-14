import type { MedusaRequest, MedusaResponse } from "@switchyard/framework/http"

// Disable global authentication - we handle it explicitly via middleware
export const AUTHENTICATE = false

/**
 * GET /scanner
 * Returns scanner configuration and status
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    features: {
      inventory_scan: true,
      barcode_lookup: true,
      location_tracking: true,
    },
  })
}

