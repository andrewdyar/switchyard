/**
 * OrderTransaction Model - Stubbed
 * 
 * Not used in Goods architecture. Payment tracking is in payment module.
 * Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare
const Order = () => require("./order").Order

export const OrderTransaction = model
  .define("OrderTransaction", {
    id: model.id({ prefix: "ordtrx" }).primaryKey(),
    order_id: model.text(),  // Required
    version: model.number().default(1),  // Required by service
    amount: model.bigNumber().default(0),  // Required, cannot be null
    currency_code: model.text().default("usd"),
    reference: model.text().nullable(),
    reference_id: model.text().nullable(),
    metadata: model.json().nullable(),
    
    // Order relationship
    order: model.belongsTo<any>(Order, {
      mappedBy: "transactions",
    }),
  })
