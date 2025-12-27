/**
 * ClaimItem Model - Maps to Supabase claim_items table
 * 
 * Individual items within a claim.
 */

import { model } from "@switchyard/framework/utils"

// Forward declare to avoid circular imports
const Claim = () => require("./claim").Claim

export const OrderClaimItem = model
  .define(
    {
      tableName: "claim_items",  // Maps to Supabase claim_items table
      name: "OrderClaimItem",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      
      // Claim reference
      claim_id: model.text(),
      
      // Order item reference
      order_item_id: model.text().nullable(),
      
      // Product reference (for easy lookup)
      sellable_product_id: model.text().nullable(),
      
      // Quantity claimed
      quantity: model.number().default(1),
      
      // Reason for this specific item
      reason: model.text().nullable(),
      
      // Claim relationship
      claim: model.belongsTo<any>(Claim, {
        mappedBy: "items",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_claim_items_claim_id",
      on: ["claim_id"],
      unique: false,
    },
    {
      name: "IDX_claim_items_order_item_id",
      on: ["order_item_id"],
      unique: false,
      where: "order_item_id IS NOT NULL",
    },
  ])
