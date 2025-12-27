/**
 * InventoryItem Model - Extended for Goods Supabase Schema
 * 
 * This extends the standard Medusa InventoryItem model with additional fields
 * for FEFO/FIFO tracking in the Goods warehouse.
 * 
 * Standard Medusa fields are kept for service compatibility.
 * Goods-specific fields are added for physical stock tracking.
 */

import { model } from "@switchyard/framework/utils"
import InventoryLevel from "./inventory-level"
import ReservationItem from "./reservation-item"

const InventoryItem = model
  .define("InventoryItem", {
    id: model.id({ prefix: "iitem" }).primaryKey(),
    
    // Standard Medusa fields (kept for service compatibility)
    sku: model.text().searchable().nullable(),
    origin_country: model.text().nullable(),
    hs_code: model.text().searchable().nullable(),
    mid_code: model.text().searchable().nullable(),
    material: model.text().nullable(),
    weight: model.number().nullable(),
    length: model.number().nullable(),
    height: model.number().nullable(),
    width: model.number().nullable(),
    requires_shipping: model.boolean().default(true),
    description: model.text().searchable().nullable(),
    title: model.text().searchable().nullable(),
    thumbnail: model.text().nullable(),
    metadata: model.json().nullable(),
    
    // Goods-specific fields for FEFO/FIFO physical stock tracking
    sellable_product_id: model.text().nullable(),  // Reference to sellable_products
    quantity: model.number().default(0),  // Physical quantity in stock
    reserved_quantity_goods: model.number().default(0),  // Reserved for orders
    received_at: model.dateTime().nullable(),  // For FIFO picking
    expiration_date: model.dateTime().nullable(),  // For FEFO picking
    lot_number: model.text().nullable(),
    source_sweep_id: model.text().nullable(),  // Which sweep brought this in
    unit_cost: model.bigNumber().nullable(),  // Acquisition cost
    
    // Standard Medusa relationships
    location_levels: model.hasMany(() => InventoryLevel, {
      mappedBy: "inventory_item",
    }),
    reservation_items: model.hasMany(() => ReservationItem, {
      mappedBy: "inventory_item",
    }),
    reserved_quantity: model.number().computed(),
    stocked_quantity: model.number().computed(),
  })
  .cascades({
    delete: ["location_levels", "reservation_items"],
  })
  .indexes([
    {
      name: "IDX_inventory_item_sku",
      on: ["sku"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_item_sellable_product_id",
      on: ["sellable_product_id"],
      unique: false,
      where: "deleted_at IS NULL AND sellable_product_id IS NOT NULL",
    },
    {
      name: "IDX_inventory_item_expiration_date",
      on: ["expiration_date"],
      unique: false,
      where: "deleted_at IS NULL AND expiration_date IS NOT NULL",
    },
    {
      name: "IDX_inventory_item_received_at",
      on: ["received_at"],
      unique: false,
      where: "deleted_at IS NULL AND received_at IS NOT NULL",
    },
  ])

export default InventoryItem
