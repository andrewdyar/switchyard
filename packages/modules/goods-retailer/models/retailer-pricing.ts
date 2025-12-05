/**
 * Goods Retailer Pricing Model
 * 
 * Tracks pricing from source retailers (what Goods pays)
 * Separate from Medusa's native pricing which tracks what customers pay.
 * 
 * This enables margin calculation and price comparison.
 */

import { model } from "@medusajs/framework/utils"

export const RetailerPricing = model.define("goods_retailer_pricing", {
  id: model.id().primaryKey(),
  
  // Links to Medusa Product
  product_id: model.text(),
  
  // Location-specific pricing
  store_name: model.text(),           // 'heb', 'costco-681-wh', etc.
  location_id: model.text().nullable(), // Store location ID if applicable
  
  // Price data
  list_price: model.bigNumber(),      // Regular price in cents
  sale_price: model.bigNumber().nullable(),
  is_on_sale: model.boolean().default(false),
  is_price_cut: model.boolean().default(false),
  
  // Unit pricing
  price_per_unit: model.bigNumber().nullable(),
  price_per_unit_uom: model.text().nullable(),  // 'oz', 'lb', 'each'
  price_type: model.text().nullable(),          // 'EACH', 'WEIGHT'
  
  // Effective dates (for price history)
  effective_from: model.dateTime().default(() => new Date()),
  effective_to: model.dateTime().nullable(),
  
  // Pricing context
  pricing_context: model.text().nullable(),     // 'ONLINE', 'CURBSIDE', 'IN_STORE'
})

export default RetailerPricing

