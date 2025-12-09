import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { productsQueryKeys } from "./products"

const INVENTORY_GROUPS_QUERY_KEY = "inventory_groups" as const
export const inventoryGroupsQueryKeys =
  queryKeysFactory(INVENTORY_GROUPS_QUERY_KEY)

// Types for Inventory Groups
export interface InventoryGroupDTO {
  id: string
  name: string
  handle: string | null
  description: string | null
  mpath: string | null
  is_active: boolean
  rank: number
  metadata: Record<string, unknown> | null
  type: "zone" | "aisle" | "group" | "shelf"
  zone_code: "A" | "R" | "F" | null
  aisle_number: number | null
  group_number: number | null
  shelf_number: number | null
  location_code: string | null
  parent_group_id: string | null
  parent_group?: InventoryGroupDTO | null
  group_children?: InventoryGroupDTO[]
  created_at: string
  updated_at: string
}

export interface InventoryGroupResponse {
  inventory_group: InventoryGroupDTO
}

export interface InventoryGroupListResponse {
  inventory_groups: InventoryGroupDTO[]
  count: number
  offset: number
  limit: number
}

export interface InventoryGroupDeleteResponse {
  id: string
  object: "inventory_group"
  deleted: boolean
}

export interface CreateInventoryGroupDTO {
  name: string
  description?: string | null
  handle?: string | null
  is_active?: boolean
  type: "zone" | "aisle" | "group" | "shelf"
  zone_code?: "A" | "R" | "F" | null
  aisle_number?: number | null
  group_number?: number | null
  shelf_number?: number | null
  location_code?: string | null
  parent_group_id?: string | null
  metadata?: Record<string, unknown> | null
  rank?: number
}

export interface UpdateInventoryGroupDTO {
  name?: string
  description?: string | null
  handle?: string | null
  is_active?: boolean
  type?: "zone" | "aisle" | "group" | "shelf"
  zone_code?: "A" | "R" | "F" | null
  aisle_number?: number | null
  group_number?: number | null
  shelf_number?: number | null
  location_code?: string | null
  parent_group_id?: string | null
  metadata?: Record<string, unknown> | null
  rank?: number
}

export interface InventoryGroupListParams {
  q?: string
  id?: string | string[]
  name?: string | string[]
  handle?: string | string[]
  type?: string | string[]
  zone_code?: string | string[]
  parent_group_id?: string | string[] | null
  is_active?: boolean
  include_ancestors_tree?: boolean
  include_descendants_tree?: boolean
  offset?: number
  limit?: number
  fields?: string
}

export interface UpdateInventoryGroupProductsDTO {
  add?: string[]
  remove?: string[]
}

// Fetch functions using fetch API
const BASE_URL = "/admin/inventory-groups"

export async function fetchInventoryGroup(
  id: string,
  query?: Record<string, any>
): Promise<InventoryGroupResponse> {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value))
      }
    })
  }
  const url = `${BASE_URL}/${id}${params.toString() ? `?${params}` : ""}`
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch inventory group: ${res.statusText}`)
  }
  return res.json()
}

async function fetchInventoryGroups(
  query?: InventoryGroupListParams
): Promise<InventoryGroupListResponse> {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, String(v)))
        } else {
          params.append(key, String(value))
        }
      }
    })
  }
  const url = `${BASE_URL}${params.toString() ? `?${params}` : ""}`
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch inventory groups: ${res.statusText}`)
  }
  return res.json()
}

async function createInventoryGroup(
  payload: CreateInventoryGroupDTO
): Promise<InventoryGroupResponse> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to create inventory group: ${res.statusText}`)
  }
  return res.json()
}

async function updateInventoryGroup(
  id: string,
  payload: UpdateInventoryGroupDTO
): Promise<InventoryGroupResponse> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to update inventory group: ${res.statusText}`)
  }
  return res.json()
}

async function deleteInventoryGroup(
  id: string
): Promise<InventoryGroupDeleteResponse> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to delete inventory group: ${res.statusText}`)
  }
  return res.json()
}

async function updateInventoryGroupProducts(
  id: string,
  payload: UpdateInventoryGroupProductsDTO
): Promise<InventoryGroupResponse> {
  const res = await fetch(`${BASE_URL}/${id}/products`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(
      `Failed to update inventory group products: ${res.statusText}`
    )
  }
  return res.json()
}

// React Query Hooks
export const useInventoryGroup = (
  id: string,
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      InventoryGroupResponse,
      Error,
      InventoryGroupResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: inventoryGroupsQueryKeys.detail(id, query),
    queryFn: () => fetchInventoryGroup(id, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useInventoryGroups = (
  query?: InventoryGroupListParams,
  options?: Omit<
    UseQueryOptions<
      InventoryGroupListResponse,
      Error,
      InventoryGroupListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: inventoryGroupsQueryKeys.list(query),
    queryFn: () => fetchInventoryGroups(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useCreateInventoryGroup = (
  options?: UseMutationOptions<
    InventoryGroupResponse,
    Error,
    CreateInventoryGroupDTO
  >
) => {
  return useMutation({
    mutationFn: (payload) => createInventoryGroup(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateInventoryGroup = (
  id: string,
  options?: UseMutationOptions<
    InventoryGroupResponse,
    Error,
    UpdateInventoryGroupDTO
  >
) => {
  return useMutation({
    mutationFn: (payload) => updateInventoryGroup(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.detail(id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteInventoryGroup = (
  id: string,
  options?: UseMutationOptions<InventoryGroupDeleteResponse, Error, void>
) => {
  return useMutation({
    mutationFn: () => deleteInventoryGroup(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateInventoryGroupProducts = (
  id: string,
  options?: UseMutationOptions<
    InventoryGroupResponse,
    Error,
    UpdateInventoryGroupProductsDTO
  >
) => {
  return useMutation({
    mutationFn: (payload) => updateInventoryGroupProducts(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: inventoryGroupsQueryKeys.details(),
      })
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.details(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

