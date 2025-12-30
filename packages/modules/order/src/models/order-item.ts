/**
 * GoodsOrderItem Model - Maps to Supabase order_items table
 * 
 * This combined model serves as both OrderLineItem and OrderItem:
 * - LineItem fields: title, thumbnail, quantity, unit_price
 * - Item fields: fulfilled_quantity, shipped_quantity, return quantities
 * - Goods-specific: sweep_id, picked_at, packed_at, fulfillment_source, allocated_at
 * 
 * Note: item_id is a self-reference (equals id) for Medusa compatibility
 */

import { model } from "@switchyard/framework/utils"

// Forward declare to avoid circular imports
const Order = () => require("./order").Order

export const GoodsOrderItem = model
  .define(
    {
      tableName: "order_items",
      name: "OrderItem",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Self-reference for combined LineItem+Item model (Medusa compatibility)
      // This equals id for our combined model - required by service
      item_id: model.text(),
      
      // Order reference
      order_id: model.text(),
      
      // Product reference
      sellable_product_id: model.text(),
      
      // LineItem fields (snapshot at purchase time)
      title: model.text().nullable(),
      thumbnail: model.text().nullable(),
      
      // Quantity and pricing
      quantity: model.number(),
      unit_price: model.bigNumber(),
      total_price: model.bigNumber().nullable(),
      
      // Fulfillment tracking (OrderItem fields)
      fulfilled_quantity: model.number().default(0),
      shipped_quantity: model.number().default(0),
      
      // Return quantity tracking (Medusa compatibility)
      return_requested_quantity: model.number().default(0),
      return_received_quantity: model.number().default(0),
      return_dismissed_quantity: model.number().default(0),
      written_off_quantity: model.number().default(0),
      
      // Tax configuration
      is_tax_inclusive: model.boolean().default(true),
      
      // Goods fulfillment fields
      source: model.text().nullable(),
      sweep_id: model.text().nullable(),
      picked_at: model.dateTime().nullable(),
      packed_at: model.dateTime().nullable(),
      fulfillment_source: model.text().nullable(),
      allocated_at: model.dateTime().nullable(),
      
      // Soft delete
      deleted_at: model.dateTime().nullable(),
      
      // Relationship to order
      order: model.belongsTo<any>(Order, {
        mappedBy: "items",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_order_items_order_id",
      on: ["order_id"],
    },
    {
      name: "IDX_order_items_sellable_product_id",
      on: ["sellable_product_id"],
    },
    {
      name: "IDX_order_items_sweep_id",
      on: ["sweep_id"],
      where: "sweep_id IS NOT NULL",
    },
    {
      name: "IDX_order_items_deleted_at",
      on: ["deleted_at"],
      where: "deleted_at IS NOT NULL",
    },
    {
      name: "IDX_order_items_item_id",
      on: ["item_id"],
      where: "item_id IS NOT NULL",
    },
  ])

// Keep OrderItem export for backwards compatibility
export const OrderItem = GoodsOrderItem
