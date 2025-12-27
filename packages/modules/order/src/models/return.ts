/**
 * Return Model - Stubbed
 * 
 * Not used in Goods architecture. Claims are used instead.
 * Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare
const Order = () => require("./order").Order

export const Return = model
  .define("Return", {
    id: model.id({ prefix: "ret" }).primaryKey(),
    order_id: model.text(),  // Required
    status: model.text().nullable(),
    metadata: model.json().nullable(),
    
    // Order relationship
    order: model.belongsTo<any>(Order, {
      mappedBy: "returns",
    }),
  })
