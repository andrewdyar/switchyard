/**
 * Goods Product Attributes Model
 * 
 * Extends Medusa products with Goods-specific attributes:
 * - Brand
 * - Unit of measure
 * - Dietary flags (organic, gluten-free, vegan, etc.)
 * - Pricing flags (priced by weight, on ad, etc.)
 */

import { model } from "@switchyard/framework/utils"

export const ProductAttributes = model.define("goods_product_attributes", {
  id: model.id().primaryKey(),
  
  // Will be linked to Medusa product via Module Link
  
  // Brand information
  brand: model.text().nullable(),
  
  // Unit and measurement
  unit_of_measure: model.text().default("each"),      // 'each', 'lb', 'oz', 'gal'
  priced_by_weight: model.boolean().default(false),
  
  // Dietary flags
  is_organic: model.boolean().default(false),
  is_gluten_free: model.boolean().default(false),
  is_vegan: model.boolean().default(false),
  is_non_gmo: model.boolean().default(false),
  
  // Merchandising flags
  is_new: model.boolean().default(false),
  on_ad: model.boolean().default(false),
  best_available: model.boolean().default(false),
  show_coupon_flag: model.boolean().default(false),
  in_assortment: model.boolean().default(true),
  
  // Category path (for display)
  full_category_hierarchy: model.text().nullable(),   // "Dairy & eggs/Milk"
  
  // External links
  product_page_url: model.text().nullable(),

  // Inventory type (Warehouse or Sweep)
  inventory_type: model.text().nullable(), // 'Warehouse' | 'Sweep'

  // Warehouse location (only for Warehouse inventory type)
  warehouse_aisle: model.text().nullable(),        // e.g., "3"
  warehouse_shelf_group: model.text().nullable(),  // e.g., "C"
  warehouse_shelf: model.text().nullable(),        // e.g., "2"
})

export default ProductAttributes

