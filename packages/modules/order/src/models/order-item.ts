/**
 * GoodsOrderItem Model - Maps to Supabase order_items table
 * 
 * Order line items that reference sellable_products with fulfillment tracking.
 * Includes Medusa compatibility fields to satisfy OrderItem interface.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare to avoid circular imports
const Order = () => require("./order").Order

export const GoodsOrderItem = model
  .define(
    {
      tableName: "order_items",  // Maps to Supabase order_items table
      name: "OrderItem",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      
      // Order reference
      order_id: model.text(),
      
      // Medusa compatibility - item_id (same as id for our use)
      item_id: model.text(),
      
      // Product reference (sellable_products, not product_variant)
      sellable_product_id: model.text(),
      
      // Also store as variant_id for Medusa compatibility
      variant_id: model.text().nullable(),
      product_id: model.text().nullable(),
      
      // Display info
      title: model.text().nullable(),
      subtitle: model.text().nullable(),
      thumbnail: model.text().nullable(),
      
      // Quantity and pricing
      quantity: model.number(),
      unit_price: model.bigNumber(),
      total_price: model.bigNumber().nullable(),
      
      // Medusa quantity tracking fields
      fulfilled_quantity: model.bigNumber().default(0),
      shipped_quantity: model.bigNumber().default(0),
      return_requested_quantity: model.bigNumber().default(0),
      return_received_quantity: model.bigNumber().default(0),
      return_dismissed_quantity: model.bigNumber().default(0),
      written_off_quantity: model.bigNumber().default(0),
      delivered_quantity: model.bigNumber().default(0),
      
      // Fulfillment source
      source: model.text().nullable(),  // General source
      fulfillment_source: model.text().nullable(),  // 'inventory' or 'sweep'
      sweep_id: model.text().nullable(),  // Reference to sweep if sourced from sweep
      
      // Fulfillment status
      allocated_at: model.dateTime().nullable(),
      picked_at: model.dateTime().nullable(),
      packed_at: model.dateTime().nullable(),
      
      // Other Medusa fields
      metadata: model.json().nullable(),
      is_tax_inclusive: model.boolean().default(false),
      compare_at_unit_price: model.bigNumber().nullable(),
      
      // Order relationship
      order: model.belongsTo<any>(Order, {
        mappedBy: "items",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_order_items_order_id",
      on: ["order_id"],
      unique: false,
    },
    {
      name: "IDX_order_items_sellable_product_id",
      on: ["sellable_product_id"],
      unique: false,
    },
    {
      name: "IDX_order_items_sweep_id",
      on: ["sweep_id"],
      unique: false,
      where: "sweep_id IS NOT NULL",
    },
    {
      name: "IDX_order_items_item_id",
      on: ["item_id"],
      unique: false,
    },
  ])

// Keep OrderItem export for backwards compatibility
export const OrderItem = GoodsOrderItem
