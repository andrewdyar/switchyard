/**
 * Order Model - Maps to Supabase orders table
 * 
 * Includes new columns added via migration:
 * - display_id: Human-readable order number
 * - currency_code: Currency (default 'usd')
 * - deleted_at: Soft delete support
 */

import { model } from "@switchyard/framework/utils"

// Forward declare to avoid circular imports
const GoodsOrderItem = () => require("./order-item").GoodsOrderItem
const Claim = () => require("./claim").Claim

const _Order = model
  .define(
    {
      tableName: "orders",
      name: "Order",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Medusa compatibility fields (new)
      display_id: model.number().nullable(),  // Auto-increment display ID
      currency_code: model.text().default("usd"),
      
      // Core order fields
      user_id: model.text().nullable(),
      order_number: model.text().searchable().nullable(),
      status: model.text().default("pending"),
      total_amount: model.bigNumber().nullable(),
      
      // Payment fields
      payment_status: model.text().nullable(),
      payment_method: model.text().nullable(),
      payment_transaction_id: model.text().nullable(),
      payment_collection_id: model.text().nullable(),
      
      // Scheduling fields
      order_cutoff_time: model.dateTime().nullable(),
      estimated_pickup_time: model.dateTime().nullable(),
      actual_pickup_time: model.dateTime().nullable(),
      
      // Additional fields
      portal_id: model.text().nullable(),
      notes: model.text().nullable(),
      source: model.text().nullable(),
      created_by: model.text().nullable(),
      location_id: model.text().nullable(),
      
      // Soft delete
      deleted_at: model.dateTime().nullable(),
      
      // Relationships
      items: model.hasMany<any>(GoodsOrderItem, {
        mappedBy: "order",
      }),
      
      claims: model.hasMany<any>(Claim, {
        mappedBy: "order",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_orders_order_number",
      on: ["order_number"],
      where: "order_number IS NOT NULL",
    },
    {
      name: "IDX_orders_user_id",
      on: ["user_id"],
      where: "user_id IS NOT NULL",
    },
    {
      name: "IDX_orders_status",
      on: ["status"],
    },
    {
      name: "IDX_orders_location_id",
      on: ["location_id"],
      where: "location_id IS NOT NULL",
    },
    {
      name: "IDX_orders_display_id",
      on: ["display_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_orders_deleted_at",
      on: ["deleted_at"],
      where: "deleted_at IS NOT NULL",
    },
  ])

export const Order = _Order
