/**
 * InventoryItem Model - Maps to Supabase inventory_items table
 * 
 * Combines Medusa compatibility fields (sku, requires_shipping) with
 * Goods lot-based inventory fields (expiration_date, lot_number, etc.)
 */

import { model } from "@switchyard/framework/utils"

const InventoryItem = model
  .define(
    {
      tableName: "inventory_items",
      name: "InventoryItem",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Product reference
      sellable_product_id: model.text(),
      
      // Location
      location_id: model.text().nullable(),
      
      // Medusa compatibility fields (new)
      sku: model.text().nullable(),
      requires_shipping: model.boolean().default(false),
      
      // Quantity management
      quantity: model.number().default(0),
      reserved_quantity: model.number().default(0),
      
      // Lot-based inventory (Goods-specific FEFO/FIFO)
      received_at: model.dateTime().nullable(),
      expiration_date: model.dateTime().nullable(),
      lot_number: model.text().nullable(),
      source_sweep_id: model.text().nullable(),
      unit_cost: model.bigNumber().nullable(),
      
      // Availability
      is_available: model.boolean().default(true),
      last_counted_at: model.dateTime().nullable(),
      
      // Soft delete
      deleted_at: model.dateTime().nullable(),
    }
  )
  .indexes([
    {
      name: "IDX_inventory_items_sellable_product_id",
      on: ["sellable_product_id"],
    },
    {
      name: "IDX_inventory_items_location_id",
      on: ["location_id"],
      where: "location_id IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_expiration_date",
      on: ["expiration_date"],
      where: "expiration_date IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_is_available",
      on: ["is_available"],
      where: "is_available = true",
    },
    {
      name: "IDX_inventory_items_sku",
      on: ["sku"],
      where: "deleted_at IS NULL AND sku IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_deleted_at",
      on: ["deleted_at"],
      where: "deleted_at IS NOT NULL",
    },
  ])

export default InventoryItem
