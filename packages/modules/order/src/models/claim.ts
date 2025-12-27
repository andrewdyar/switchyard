/**
 * Claim Model - Maps to Supabase claims table
 * 
 * Customer claims for missing, damaged, or wrong items.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare to avoid circular imports
const Order = () => require("./order").Order
const ClaimItem = () => require("./claim-item").OrderClaimItem

export const Claim = model
  .define(
    {
      tableName: "claims",  // Maps to Supabase claims table
      name: "OrderClaim",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      
      // Order reference
      order_id: model.text().nullable(),
      
      // Customer who filed the claim
      customer_id: model.text().nullable(),
      
      // Claim type: 'missing_item', 'damaged', 'wrong_item', 'quality'
      claim_type: model.text().nullable(),
      
      // Status: 'pending', 'approved', 'denied', 'refunded'
      status: model.text().default("pending"),
      
      // Description from customer
      description: model.text().nullable(),
      
      // Resolution notes from staff
      resolution: model.text().nullable(),
      
      // Refund amount if applicable
      refund_amount: model.bigNumber().nullable(),
      
      // Resolution tracking
      resolved_at: model.dateTime().nullable(),
      resolved_by: model.text().nullable(),
      
      // Relationships
      order: model.belongsTo<any>(Order, {
        mappedBy: "claims",
      }),
      
      items: model.hasMany<any>(ClaimItem, {
        mappedBy: "claim",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_claims_order_id",
      on: ["order_id"],
      unique: false,
      where: "order_id IS NOT NULL",
    },
    {
      name: "IDX_claims_customer_id",
      on: ["customer_id"],
      unique: false,
      where: "customer_id IS NOT NULL",
    },
    {
      name: "IDX_claims_status",
      on: ["status"],
      unique: false,
    },
  ])

// Export as OrderClaim for compatibility with existing index.ts
export const OrderClaim = Claim
