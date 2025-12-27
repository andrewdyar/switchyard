/**
 * InventoryItem Model - Adapted for Goods Supabase Schema
 * 
 * Maps to Supabase `inventory_items` table which tracks physical warehouse stock
 * with FEFO/FIFO support (expiration dates and received dates).
 * 
 * This replaces Medusa's default InventoryItem (catalog metadata) and InventoryLevel
 * (stock per location) models with a single entity that tracks physical items.
 */

import { model } from "@switchyard/framework/utils"

const InventoryItem = model
  .define(
    {
      tableName: "inventory_items",
      name: "InventoryItem",
    },
    {
      id: model.id().primaryKey(),
      
      // Reference to sellable_products (what product this inventory is for)
      sellable_product_id: model.text(),
      
      // Reference to inventory_locations (where it's stored in RFC)
      location_id: model.text(),
      
      // Stock quantities
      quantity: model.number().default(0),
      reserved_quantity: model.number().default(0),
      
      // FIFO: When this inventory was received
      received_at: model.dateTime(),
      
      // FEFO: Expiration date (nullable for non-perishables)
      expiration_date: model.dateTime().nullable(),
      
      // Lot tracking
      lot_number: model.text().nullable(),
      
      // Which sweep brought this inventory in (for cost tracking)
      source_sweep_id: model.text().nullable(),
      
      // Acquisition cost per unit
      unit_cost: model.bigNumber().nullable(),
      
      // Standard metadata
      metadata: model.json().nullable(),
      
      // Computed: available quantity
      available_quantity: model.number().computed(),
    }
  )
  .indexes([
    {
      name: "IDX_inventory_items_sellable_product_id",
      on: ["sellable_product_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_items_location_id",
      on: ["location_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_items_expiration_date",
      on: ["expiration_date"],
      unique: false,
      where: "deleted_at IS NULL AND expiration_date IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_received_at",
      on: ["received_at"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_items_source_sweep_id",
      on: ["source_sweep_id"],
      unique: false,
      where: "deleted_at IS NULL AND source_sweep_id IS NOT NULL",
    },
  ])

export default InventoryItem
