/**
 * Driver Model
 * 
 * Drivers who perform sweeps (retailer shopping trips) and deliveries.
 * Can optionally be linked to a Customer account.
 */

import { model } from "@switchyard/framework/utils"

export const Driver = model.define("goods_driver", {
  id: model.id().primaryKey(),
  
  // Optional link to customer account
  customer_id: model.text().nullable(),
  
  // Contact info
  first_name: model.text(),
  last_name: model.text(),
  phone: model.text(),
  email: model.text().nullable(),
  
  // Driving info
  license_number: model.text().nullable(),
  vehicle_info: model.text().nullable(),
  
  is_active: model.boolean().default(true),
})

export default Driver

