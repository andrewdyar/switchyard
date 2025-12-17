/**
 * React Query hooks for scraped products
 * 
 * Provides data fetching for the Scraped Products dashboard.
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import {
  fetchScrapedProducts,
  fetchScrapedProduct,
  fetchCategories,
  fetchPriceHistory,
  ScrapedProductListItem,
  ScrapedProductDetail,
  ScrapedProductsListParams,
  Category,
  RetailerPricing,
} from "../lib/supabase"

// Query keys factory
export const scrapedProductsQueryKeys = {
  all: ["scraped-products"] as const,
  lists: () => [...scrapedProductsQueryKeys.all, "list"] as const,
  list: (params: ScrapedProductsListParams) =>
    [...scrapedProductsQueryKeys.lists(), params] as const,
  details: () => [...scrapedProductsQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...scrapedProductsQueryKeys.details(), id] as const,
  priceHistory: (id: string, days: number) =>
    [...scrapedProductsQueryKeys.detail(id), "price-history", days] as const,
  categories: () => ["categories"] as const,
}

// Hook to fetch paginated list of scraped products
export function useScrapedProducts(
  params: ScrapedProductsListParams = {},
  options?: Omit<
    UseQueryOptions<
      { products: ScrapedProductListItem[]; count: number },
      Error
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: scrapedProductsQueryKeys.list(params),
    queryFn: () => fetchScrapedProducts(params),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

// Hook to fetch a single scraped product with retailer comparisons
export function useScrapedProduct(
  id: string,
  options?: Omit<
    UseQueryOptions<ScrapedProductDetail | null, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: scrapedProductsQueryKeys.detail(id),
    queryFn: () => fetchScrapedProduct(id),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!id,
    ...options,
  })
}

// Hook to fetch price history for a product
export function usePriceHistory(
  productId: string,
  days: number = 30,
  options?: Omit<UseQueryOptions<RetailerPricing[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: scrapedProductsQueryKeys.priceHistory(productId, days),
    queryFn: () => fetchPriceHistory(productId, days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!productId,
    ...options,
  })
}

// Hook to fetch categories for filtering
export function useCategories(
  options?: Omit<UseQueryOptions<Category[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: scrapedProductsQueryKeys.categories(),
    queryFn: () => fetchCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
    ...options,
  })
}

// Utility hook to get table query params from URL
export function useScrapedProductsTableQuery(pageSize: number = 20) {
  // In a real implementation, this would parse URL search params
  // For now, return default params
  return {
    searchParams: {
      page: 1,
      pageSize,
    } as ScrapedProductsListParams,
    raw: {},
  }
}
