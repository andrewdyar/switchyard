/**
 * Supabase client for admin dashboard
 * 
 * Used for querying scraped products data directly from Supabase.
 * This bypasses the Medusa API for tables that are Supabase-native.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Types for scraped products data
export interface SourceProduct {
  id: string
  name: string
  barcode: string | null
  brand: string | null
  image_url: string | null
  size: string | null
  size_uom: string | null
  category_id: string | null
  subcategory_id: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface RetailerMapping {
  id: string
  product_id: string
  store_name: string
  retailer_location_id: string | null
  store_item_id: string
  store_item_name: string | null
  store_location: string | null
  store_zone: string | null
  store_aisle: number | null
  is_active: boolean
  last_seen_at: string | null
  out_of_stock_count: number
}

export interface RetailerPricing {
  id: string
  product_id: string
  store_name: string
  retailer_location_id: string | null
  price: number | null
  list_price: number | null
  sale_price: number | null
  is_on_sale: boolean
  price_per_unit: number | null
  price_per_unit_uom: string | null
  effective_from: string
  effective_to: string | null
}

export interface ProductAttributes {
  id: string
  brand: string | null
  unit_of_measure: string | null
  is_organic: boolean
  is_gluten_free: boolean
  is_vegan: boolean
  is_non_gmo: boolean
  warehouse_zone: string | null
  warehouse_aisle: string | null
  warehouse_shelf_group: string | null
  warehouse_shelf: string | null
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  source: string | null
  level: number
}

// Aggregated product with retailer data for list view
export interface ScrapedProductListItem {
  id: string
  name: string
  barcode: string | null
  brand: string | null
  image_url: string | null
  category_name: string | null
  retailer_count: number
  lowest_price: number | null
  last_seen_at: string | null
  is_linked_to_product: boolean // Linked to a Medusa product (sellable)
}

// Full product detail with all retailer comparisons
export interface ScrapedProductDetail extends SourceProduct {
  category?: Category | null
  retailers: RetailerComparison[]
  is_linked_to_product: boolean // Linked to a Medusa product (sellable)
  linked_product_id: string | null
}

export interface RetailerComparison {
  store_name: string
  store_item_name: string | null
  store_location: string | null
  is_available: boolean
  last_seen_at: string | null
  price: number | null
  list_price: number | null
  sale_price: number | null
  is_on_sale: boolean
  price_per_unit: number | null
  price_per_unit_uom: string | null
}

// Supabase client singleton
let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    )
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

// Query functions for React Query

export interface ScrapedProductsListParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  retailer?: string
  sortBy?: "name" | "updated_at" | "lowest_price" | "retailer_count"
  sortOrder?: "asc" | "desc"
}

export async function fetchScrapedProducts(
  params: ScrapedProductsListParams = {}
): Promise<{ products: ScrapedProductListItem[]; count: number }> {
  const {
    page = 1,
    pageSize = 20,
    search,
    category,
    sortBy = "updated_at",
    sortOrder = "desc",
  } = params

  const supabase = getSupabaseClient()
  const offset = (page - 1) * pageSize

  // Build base query - using left joins to avoid excluding products without mappings
  // Tables renamed: source_products -> scraped_products, goods_retailer_* -> retailer_*
  let query = supabase
    .from("scraped_products")
    .select(
      `
      id,
      name,
      barcode,
      brand,
      image_url,
      updated_at,
      categories!scraped_products_category_id_fkey (
        id,
        name
      ),
      retailer_mappings (
        store_name,
        is_active,
        last_seen_at
      ),
      retailer_pricing (
        price,
        effective_to
      ),
      sellable_products (
        id
      )
    `,
      { count: "exact" }
    )
    .range(offset, offset + pageSize - 1)

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,brand.ilike.%${search}%`)
  }

  // Apply category filter
  if (category) {
    query = query.eq("category_id", category)
  }

  // Apply sorting
  const sortColumn = sortBy === "lowest_price" ? "updated_at" : sortBy
  query = query.order(sortColumn, { ascending: sortOrder === "asc" })

  const { data, error, count } = await query

  if (error) {
    console.error("Error fetching scraped products:", error)
    throw error
  }

  // Transform data to list items
  const products: ScrapedProductListItem[] = (data || []).map((product: any) => {
    const mappings = product.retailer_mappings || []
    const pricings = (product.retailer_pricing || []).filter(
      (p: any) => p.effective_to === null
    )
    
    // Check if linked to a sellable product
    const sellableProducts = product.sellable_products || []
    const isLinkedToProduct = sellableProducts.length > 0

    const activeMappings = mappings.filter((m: any) => m.is_active)
    const retailerCount = new Set(activeMappings.map((m: any) => m.store_name)).size
    const lowestPrice = pricings.length > 0
      ? Math.min(...pricings.map((p: any) => p.price).filter((p: any) => p !== null))
      : null
    const lastSeen = activeMappings.length > 0
      ? activeMappings
          .map((m: any) => m.last_seen_at)
          .filter((d: any) => d)
          .sort()
          .pop()
      : null

    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      brand: product.brand,
      image_url: product.image_url,
      category_name: product.categories?.name || null,
      retailer_count: retailerCount,
      lowest_price: lowestPrice,
      last_seen_at: lastSeen,
      is_linked_to_product: isLinkedToProduct,
    }
  })

  return { products, count: count || 0 }
}

export async function fetchScrapedProduct(id: string): Promise<ScrapedProductDetail | null> {
  const supabase = getSupabaseClient()

  // Fetch product with related data
  // Tables renamed: source_products -> scraped_products
  const { data: product, error: productError } = await supabase
    .from("scraped_products")
    .select(
      `
      *,
      categories!scraped_products_category_id_fkey (
        id,
        name,
        parent_id,
        source,
        level
      ),
      sellable_products (
        id
      )
    `
    )
    .eq("id", id)
    .single()

  if (productError) {
    console.error("Error fetching product:", productError)
    throw productError
  }

  if (!product) {
    return null
  }

  // Check if linked to a sellable product
  const sellableProducts = product.sellable_products || []
  const linkedProductId = sellableProducts.length > 0 ? sellableProducts[0].id : null

  // Fetch retailer mappings (renamed from goods_retailer_mapping)
  const { data: mappings, error: mappingsError } = await supabase
    .from("retailer_mappings")
    .select("*")
    .eq("product_id", id)

  if (mappingsError) {
    console.error("Error fetching mappings:", mappingsError)
    throw mappingsError
  }

  // Fetch current pricing for each retailer (renamed from goods_retailer_pricing)
  const { data: pricings, error: pricingsError } = await supabase
    .from("retailer_pricing")
    .select("*")
    .eq("product_id", id)
    .is("effective_to", null)

  if (pricingsError) {
    console.error("Error fetching pricing:", pricingsError)
    throw pricingsError
  }

  // Build retailer comparisons
  const retailers: RetailerComparison[] = (mappings || []).map((mapping: RetailerMapping) => {
    const pricing = (pricings || []).find(
      (p: RetailerPricing) =>
        p.store_name === mapping.store_name &&
        (p.retailer_location_id === mapping.retailer_location_id || !p.retailer_location_id)
    )

    return {
      store_name: mapping.store_name,
      store_item_name: mapping.store_item_name,
      store_location: mapping.store_location,
      is_available: mapping.is_active,
      last_seen_at: mapping.last_seen_at,
      price: pricing?.price || null,
      list_price: pricing?.list_price || null,
      sale_price: pricing?.sale_price || null,
      is_on_sale: pricing?.is_on_sale || false,
      price_per_unit: pricing?.price_per_unit || null,
      price_per_unit_uom: pricing?.price_per_unit_uom || null,
    }
  })

  // Sort by price (lowest first)
  retailers.sort((a, b) => {
    const priceA = a.price ?? Infinity
    const priceB = b.price ?? Infinity
    return priceA - priceB
  })

  return {
    ...product,
    category: product.categories || null,
    retailers,
    is_linked_to_product: !!linkedProductId,
    linked_product_id: linkedProductId,
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  if (error) {
    console.error("Error fetching categories:", error)
    throw error
  }

  return data || []
}

export async function fetchPriceHistory(
  productId: string,
  days: number = 30
): Promise<RetailerPricing[]> {
  const supabase = getSupabaseClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Table renamed from goods_retailer_pricing to retailer_pricing
  const { data, error } = await supabase
    .from("retailer_pricing")
    .select("*")
    .eq("product_id", productId)
    .gte("effective_from", startDate.toISOString())
    .order("effective_from", { ascending: true })

  if (error) {
    console.error("Error fetching price history:", error)
    throw error
  }

  return data || []
}
