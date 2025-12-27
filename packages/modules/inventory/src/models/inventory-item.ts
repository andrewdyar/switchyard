/**
 * InventoryItem Model - Maps to Supabase inventory_items table
 * 
 * Lot-based physical inventory with FEFO/FIFO picking support.
 * Each row represents a specific lot/batch of a product.
 * 
 * Note: Some Medusa compatibility fields are included to satisfy InventoryItemDTO interface.
 */

import { model } from "@switchyard/framework/utils"

const InventoryItem = model
  .define(
    {
      tableName: "inventory_items",  // Maps to Supabase inventory_items table
      name: "InventoryItem",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      
      // Product reference (sellable_products)
      sellable_product_id: model.text(),
      
      // Medusa compatibility - SKU field
      sku: model.text().searchable().nullable(),
      
      // Location in warehouse (inventory_locations)
      location_id: model.text().nullable(),
      
      // Quantity tracking
      quantity: model.number().default(0),
      reserved_quantity: model.number().default(0),
      
      // FEFO/FIFO fields
      received_at: model.dateTime().nullable(),  // For FIFO picking
      expiration_date: model.dateTime().nullable(),  // For FEFO picking
      
      // Lot tracking
      lot_number: model.text().nullable(),
      
      // Source tracking
      source_sweep_id: model.text().nullable(),  // Which sweep brought this in
      
      // Cost tracking
      unit_cost: model.bigNumber().nullable(),
      
      // Availability
      is_available: model.boolean().default(true),
      
      // Counting
      last_counted_at: model.dateTime().nullable(),
      
      // Medusa compatibility fields (required by InventoryItemDTO)
      requires_shipping: model.boolean().default(true),
      origin_country: model.text().nullable(),
      hs_code: model.text().nullable(),
      mid_code: model.text().nullable(),
      material: model.text().nullable(),
      weight: model.number().nullable(),
      length: model.number().nullable(),
      height: model.number().nullable(),
      width: model.number().nullable(),
      title: model.text().nullable(),
      description: model.text().nullable(),
      thumbnail: model.text().nullable(),
      metadata: model.json().nullable(),
    }
  )
  .indexes([
    {
      name: "IDX_inventory_items_sellable_product_id",
      on: ["sellable_product_id"],
      unique: false,
    },
    {
      name: "IDX_inventory_items_location_id",
      on: ["location_id"],
      unique: false,
      where: "location_id IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_expiration_date",
      on: ["expiration_date"],
      unique: false,
      where: "expiration_date IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_received_at",
      on: ["received_at"],
      unique: false,
      where: "received_at IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_is_available",
      on: ["is_available"],
      unique: false,
      where: "is_available = true",
    },
    {
      name: "IDX_inventory_items_source_sweep_id",
      on: ["source_sweep_id"],
      unique: false,
      where: "source_sweep_id IS NOT NULL",
    },
    {
      name: "IDX_inventory_items_sku",
      on: ["sku"],
      unique: true,
      where: "sku IS NOT NULL",
    },
  ])

export default InventoryItem
