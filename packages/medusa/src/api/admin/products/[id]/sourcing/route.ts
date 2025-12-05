/**
 * API Route: Get Product Sourcing Information
 * 
 * GET /admin/products/:id/sourcing - Get retailer mappings and pricing for a product
 * 
 * This queries the original Goods data tables using the goods_id stored in product.metadata.
 */

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createClient } from "@supabase/supabase-js"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  if (!id) {
    res.status(400).json({ 
      message: "Product ID is required",
      sourcing: []
    })
    return
  }

  try {
    // First, get the product metadata to find the goods_id
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { id },
    })

    if (products.length === 0) {
      res.json({ 
        message: "Product not found",
        sourcing: [] 
      })
      return
    }

    const product = products[0]
    const goodsId = product.metadata?.goods_id

    if (!goodsId) {
      res.json({ 
        message: "No goods_id found in product metadata",
        sourcing: [] 
      })
      return
    }

    // Use Supabase client to query the original tables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      res.json({
        message: "Supabase credentials not configured",
        sourcing: [],
        goods_id: goodsId
      })
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query product_store_mappings for this goods_id
    const { data: mappings, error: mappingsError } = await supabase
      .from("product_store_mappings")
      .select("*")
      .eq("product_id", goodsId)
      .eq("is_active", true)
      .order("store_name")

    if (mappingsError) {
      console.error("Error fetching mappings:", mappingsError)
    }

    // Query product_pricing for current pricing
    const { data: pricing, error: pricingError } = await supabase
      .from("product_pricing")
      .select("*")
      .eq("product_id", goodsId)
      .or("effective_to.is.null,effective_to.gt.now()")
      .order("store_name")

    if (pricingError) {
      console.error("Error fetching pricing:", pricingError)
    }

    const mappingsData = mappings || []
    const pricingData = pricing || []

    // Combine mappings with pricing
    const sourcing = mappingsData.map((mapping: any) => {
      const retailerPricing = pricingData.find((p: any) => 
        p.store_name?.toLowerCase() === mapping.store_name?.toLowerCase()
      )

      return {
        store_name: mapping.store_name || "",
        store_item_id: mapping.store_item_id || null,
        store_item_name: mapping.store_item_name || null,
        stock_status: mapping.stock_status || null,
        store_location_text: mapping.store_location_text || null,
        // Prices stored in dollars in source, convert to cents for consistency
        list_price: retailerPricing?.list_price ? Math.round(Number(retailerPricing.list_price) * 100) : null,
        sale_price: retailerPricing?.sale_price ? Math.round(Number(retailerPricing.sale_price) * 100) : null,
        is_on_sale: retailerPricing?.is_on_sale || false,
        price_per_unit: retailerPricing?.price_per_unit ? Math.round(Number(retailerPricing.price_per_unit) * 100) : null,
        price_per_unit_uom: retailerPricing?.price_per_unit_uom || null,
      }
    })

    res.json({ 
      sourcing,
      goods_id: goodsId,
      mappings_count: mappingsData.length,
      pricing_count: pricingData.length
    })
  } catch (error) {
    console.error("Error fetching product sourcing:", error)
    res.status(500).json({ 
      message: "Failed to fetch product sourcing information",
      error: (error as Error).message,
      sourcing: []
    })
  }
}
