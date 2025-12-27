/**
 * OrderShipping Model - Stubbed
 * 
 * Not used in Goods architecture. Fulfillment is via robot delivery.
 * Kept for service compatibility.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare
const Order = () => require("./order").Order

export const OrderShipping = model
  .define("OrderShipping", {
    id: model.id({ prefix: "ordship" }).primaryKey(),
    name: model.text().nullable(),
    order_id: model.text(),  // Required for service
    shipping_method_id: model.text().nullable(),
    amount: model.bigNumber().nullable(),
    is_tax_inclusive: model.boolean().default(false),
    metadata: model.json().nullable(),
    
    // Add shipping_method reference for service compatibility
    shipping_method: model.json().nullable(),
    
    // Order relationship
    order: model.belongsTo<any>(Order, {
      mappedBy: "shipping_methods",
    }),
  })
