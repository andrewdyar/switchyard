/**
 * OrderSummary Model - Stubbed
 * 
 * Not used in Goods architecture. Totals are on orders table directly.
 * Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare
const Order = () => require("./order").Order

export const OrderSummary = model
  .define("OrderSummary", {
    id: model.id({ prefix: "ordsum" }).primaryKey(),
    order_id: model.text(),  // Required
    version: model.number().default(1),  // Required by service
    totals: model.json().nullable(),
    metadata: model.json().nullable(),
    
    // Order relationship
    order: model.belongsTo<any>(Order, {
      mappedBy: "summary",
    }),
  })
