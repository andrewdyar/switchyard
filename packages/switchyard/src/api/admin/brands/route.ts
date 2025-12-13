import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { ContainerRegistrationKeys } from "@switchyard/framework/utils"

type BrandsQueryParams = {
  q?: string
  limit?: number
  offset?: number
}

export const GET = async (
  req: AuthenticatedSwitchyardRequest<BrandsQueryParams>,
  res: SwitchyardResponse
) => {
  const { q, limit = 50, offset = 0 } = req.query as BrandsQueryParams

  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    
    let query = `
      SELECT DISTINCT brand 
      FROM source_products 
      WHERE brand IS NOT NULL AND brand != ''
    `
    const params: any[] = []
    
    if (q) {
      query += ` AND brand ILIKE $1`
      params.push(`%${q}%`)
    }
    
    query += ` ORDER BY brand ASC`
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pgConnection.raw(query, params)
    const brands = result.rows.map((row: any) => ({
      value: row.brand,
      label: row.brand,
    }))
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT brand) as count 
      FROM source_products 
      WHERE brand IS NOT NULL AND brand != ''
    `
    if (q) {
      countQuery += ` AND brand ILIKE $1`
    }
    
    const countResult = await pgConnection.raw(countQuery, q ? [`%${q}%`] : [])
    const count = parseInt(countResult.rows[0].count, 10)
    
    res.json({
      brands,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching brands:", error)
    res.status(500).json({ error: "Failed to fetch brands" })
  }
}



