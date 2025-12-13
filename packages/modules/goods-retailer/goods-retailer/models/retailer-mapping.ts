/**
 * Goods Retailer Mapping Model
 * 
 * Maps master products to store-specific SKUs across 7 retailers:
 * HEB, Walmart, Costco, Target, Whole Foods, Central Market, Trader Joe's
 * 
 * This is a custom Switchyard module that extends core functionality
 * to handle Goods' unique multi-retailer product sourcing model.
 */

import { model } from "@switchyard/framework/utils"

export const RetailerMapping = model.define("goods_retailer_mapping", {
  id: model.id().primaryKey(),
  
  // Links to Switchyard Product
  product_id: model.text(),
  
  // Retailer identification
  store_name: model.text(),           // 'heb', 'walmart', 'costco', 'target', 'whole_foods', 'central_market', 'trader_joes'
  store_item_id: model.text(),        // Retailer's internal SKU/product ID
  store_item_name: model.text().nullable(),
  
  // Store-specific imagery
  store_image_url: model.text().nullable(),
  brand_logo_url: model.text().nullable(),
  
  // Availability
  stock_status: model.text().nullable(),           // 'in_stock', 'out_of_stock', 'limited'
  store_location_text: model.text().nullable(),    // "In Dairy on the Back Wall"
  product_availability: model.json().nullable(),   // ['IN_STORE', 'CURBSIDE_PICKUP', 'DELIVERY']
  unavailability_reasons: model.json().nullable(), // ['Out of Season', 'Discontinued']
  
  // Ordering constraints
  minimum_order_quantity: model.number().nullable(),
  maximum_order_quantity: model.number().nullable(),
  
  // Scheduling
  availability_schedule: model.json().nullable(),  // Time-based availability
  
  is_active: model.boolean().default(true),
})

export default RetailerMapping

