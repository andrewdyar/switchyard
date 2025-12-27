/**
 * Order Model - Maps to Supabase orders table
 * 
 * Custom order structure for Goods with robot delivery fulfillment.
 * Includes Medusa compatibility fields.
 */

import { model, OrderStatus } from "@switchyard/framework/utils"

// Forward declare to avoid circular imports
const GoodsOrderItem = () => require("./order-item").GoodsOrderItem
const Claim = () => require("./claim").Claim
const OrderShipping = () => require("./order-shipping-method").OrderShipping
const OrderTransaction = () => require("./transaction").OrderTransaction
const OrderSummary = () => require("./order-summary").OrderSummary
const OrderCreditLine = () => require("./credit-line").OrderCreditLine
const Return = () => require("./return").Return

const _Order = model
  .define(
    {
      tableName: "orders",  // Maps to Supabase orders table
      name: "Order",
    },
    {
      // UUID primary key (matches Supabase)
      id: model.id({ prefix: "order" }).primaryKey(),
      
      // Medusa compatibility fields
      display_id: model.autoincrement().searchable(),
      
      // Customer reference (Supabase uses user_id, not customer_id)
      user_id: model.text().nullable(),
      customer_id: model.text().nullable(),  // Alias for compatibility
      
      // Order number (replaces display_id)
      order_number: model.text().searchable().nullable(),
      
      // Order status
      status: model.enum(OrderStatus).default(OrderStatus.PENDING),
      version: model.number().default(1),
      
      // Pricing
      total_amount: model.bigNumber().nullable(),
      currency_code: model.text().default("usd"),
      
      // Payment info
      payment_status: model.text().nullable(),
      payment_method: model.text().nullable(),
      payment_transaction_id: model.text().nullable(),
      payment_collection_id: model.text().nullable(),
      
      // Fulfillment timing
      order_cutoff_time: model.dateTime().nullable(),
      estimated_pickup_time: model.dateTime().nullable(),
      actual_pickup_time: model.dateTime().nullable(),
      
      // Pickup location
      portal_id: model.text().nullable(),
      
      // Order metadata
      notes: model.text().nullable(),
      source: model.text().nullable(),  // 'app' or 'admin'
      created_by: model.text().nullable(),
      email: model.text().searchable().nullable(),
      
      // Location for pricing/tax
      location_id: model.text().nullable(),
      
      // Medusa compatibility
      region_id: model.text().nullable(),
      sales_channel_id: model.text().nullable(),
      is_draft_order: model.boolean().default(false),
      no_notification: model.boolean().nullable(),
      metadata: model.json().nullable(),
      canceled_at: model.dateTime().nullable(),
      
      // Relationships
      items: model.hasMany<any>(GoodsOrderItem, {
        mappedBy: "order",
      }),
      
      claims: model.hasMany<any>(Claim, {
        mappedBy: "order",
      }),
      
      shipping_methods: model.hasMany<any>(OrderShipping, {
        mappedBy: "order",
      }),
      
      transactions: model.hasMany<any>(OrderTransaction, {
        mappedBy: "order",
      }),
      
      summary: model.hasMany<any>(OrderSummary, {
        mappedBy: "order",
      }),
      
      credit_lines: model.hasMany<any>(OrderCreditLine, {
        mappedBy: "order",
      }),
      
      returns: model.hasMany<any>(Return, {
        mappedBy: "order",
      }),
    }
  )
  .cascades({
    delete: ["items", "shipping_methods", "transactions", "summary", "credit_lines"],
  })
  .indexes([
    {
      name: "IDX_orders_order_number",
      on: ["order_number"],
      unique: false,
      where: "order_number IS NOT NULL",
    },
    {
      name: "IDX_orders_user_id",
      on: ["user_id"],
      unique: false,
      where: "user_id IS NOT NULL",
    },
    {
      name: "IDX_orders_display_id",
      on: ["display_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_orders_status",
      on: ["status"],
      unique: false,
    },
    {
      name: "IDX_orders_location_id",
      on: ["location_id"],
      unique: false,
      where: "location_id IS NOT NULL",
    },
  ])

export const Order = _Order
