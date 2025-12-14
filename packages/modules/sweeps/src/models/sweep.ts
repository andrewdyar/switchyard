/**
 * Sweep Model
 * 
 * Daily sweep schedules - one per store per day.
 * Aggregates all orders for a retailer into a single shopping trip.
 * 
 * Retailers: HEB, Target, Walmart, Central Market, Whole Foods, Costco, Trader Joes
 */

import { model } from "@switchyard/framework/utils"

export const Sweep = model.define("goods_sweep", {
  id: model.id().primaryKey(),
  
  // When/where
  store_id: model.text(),             // Links to Medusa StockLocation (retailer)
  sweep_date: model.dateTime(),
  scheduled_start_time: model.dateTime(),
  
  // Actual timing
  actual_start_time: model.dateTime().nullable(),
  actual_end_time: model.dateTime().nullable(),
  
  // Assignment
  driver_id: model.text().nullable(), // Links to Driver
  route_id: model.text().nullable(),  // External route optimization ID (e.g., Routific)
  
  // Status tracking
  status: model.text().default("scheduled"), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  
  // Aggregates
  total_items: model.number().default(0),
  total_load: model.bigNumber().nullable(),
})

export default Sweep
