/**
 * Supabase client for goods-backend
 * 
 * Used for querying Supabase-native tables like:
 * - scraped_products (formerly source_products)
 * - sellable_products
 * - inventory_items
 * - retailer_mappings
 * - retailer_pricing
 * - etc.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Supabase client singleton
let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseClient
}

// Types for the new schema

export interface SellableProduct {
  id: string
  scraped_product_id: string | null
  name: string
  brand: string | null
  description: string | null
  image_url: string | null
  size: string | null
  size_uom: string | null
  unit_count: number
  category_id: string | null
  subcategory_id: string | null
  selling_price: number
  price_per_unit: number | null
  price_per_unit_uom: string | null
  is_perishable: boolean
  is_organic: boolean
  is_gluten_free: boolean
  is_vegan: boolean
  warehouse_zone: string | null
  preferred_retailer: string | null
  status: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  sellable_product_id: string
  location_id: string | null
  quantity: number
  reserved_quantity: number
  received_at: string
  expiration_date: string | null
  lot_number: string | null
  source_sweep_id: string | null
  unit_cost: number | null
  is_available: boolean
  last_counted_at: string | null
  created_at: string
  updated_at: string
}

export interface ScrapedProduct {
  id: string
  name: string
  barcode: string | null
  brand: string | null
  image_url: string | null
  description: string | null
  category_id: string | null
  subcategory_id: string | null
  created_at: string
  updated_at: string
}

// Query functions

/**
 * Look up a sellable product by barcode
 */
export async function lookupProductByBarcode(barcode: string): Promise<SellableProduct | null> {
  const supabase = getSupabaseClient()

  // First find the scraped product by barcode
  const { data: scrapedProduct, error: scrapedError } = await supabase
    .from("scraped_products")
    .select("id")
    .eq("barcode", barcode)
    .single()

  if (scrapedError || !scrapedProduct) {
    return null
  }

  // Then find the sellable product linked to it
  const { data: sellableProduct, error: sellableError } = await supabase
    .from("sellable_products")
    .select("*")
    .eq("scraped_product_id", scrapedProduct.id)
    .single()

  if (sellableError || !sellableProduct) {
    return null
  }

  return sellableProduct
}

/**
 * Get inventory items for a sellable product using FEFO/FIFO ordering
 */
export async function getInventoryForProduct(
  sellableProductId: string,
  locationId?: string
): Promise<InventoryItem[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("sellable_product_id", sellableProductId)
    .eq("is_available", true)
    .gt("quantity", 0)
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .order("received_at", { ascending: true })

  if (locationId) {
    query = query.eq("location_id", locationId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching inventory:", error)
    throw error
  }

  return data || []
}

/**
 * Adjust inventory quantity
 */
export async function adjustInventory(
  inventoryItemId: string,
  quantityChange: number
): Promise<InventoryItem | null> {
  const supabase = getSupabaseClient()

  // Get current inventory item
  const { data: currentItem, error: getError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", inventoryItemId)
    .single()

  if (getError || !currentItem) {
    console.error("Error getting inventory item:", getError)
    return null
  }

  const newQuantity = Math.max(0, currentItem.quantity + quantityChange)

  // Update the quantity
  const { data: updatedItem, error: updateError } = await supabase
    .from("inventory_items")
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventoryItemId)
    .select()
    .single()

  if (updateError) {
    console.error("Error updating inventory:", updateError)
    throw updateError
  }

  return updatedItem
}

/**
 * Create a new inventory item (e.g., when receiving from sweep)
 */
export async function createInventoryItem(item: {
  sellable_product_id: string
  location_id?: string
  quantity: number
  expiration_date?: string
  lot_number?: string
  source_sweep_id?: string
  unit_cost?: number
}): Promise<InventoryItem> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      sellable_product_id: item.sellable_product_id,
      location_id: item.location_id || null,
      quantity: item.quantity,
      reserved_quantity: 0,
      received_at: new Date().toISOString(),
      expiration_date: item.expiration_date || null,
      lot_number: item.lot_number || null,
      source_sweep_id: item.source_sweep_id || null,
      unit_cost: item.unit_cost || null,
      is_available: true,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating inventory item:", error)
    throw error
  }

  return data
}
