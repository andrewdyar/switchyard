/**
 * OrderCreditLine Model - Stubbed
 * 
 * Not used in Goods architecture. Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare
const Order = () => require("./order").Order

export const OrderCreditLine = model
  .define("OrderCreditLine", {
    id: model.id({ prefix: "ordcl" }).primaryKey(),
    order_id: model.text(),  // Required
    metadata: model.json().nullable(),
    
    // Order relationship
    order: model.belongsTo<any>(Order, {
      mappedBy: "credit_lines",
    }),
  })
