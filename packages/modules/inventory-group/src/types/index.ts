/**
 * Types for Inventory Group Module
 */

// Zone type
export type ZoneCode = "A" | "R" | "F"

// Constants
export const ZONE_NAMES: Record<ZoneCode, string> = {
  A: "Ambient",
  R: "Refrigerated",
  F: "Frozen",
}

export const ZONE_AISLE_LIMITS: Record<ZoneCode, { min: number; max: number }> = {
  A: { min: 1, max: 12 },
  R: { min: 1, max: 4 },
  F: { min: 1, max: 2 },
}

export const GROUP_LIMITS = { min: 1, max: 22 }
export const SHELF_LIMITS = { min: 1, max: 5 }

// DTO Types
export interface InventoryGroupDTO {
  id: string
  name: string
  handle: string | null
  description: string | null
  mpath: string | null
  is_active: boolean
  rank: number
  metadata: Record<string, unknown> | null
  type: string | null
  zone_code: string | null
  aisle_number: number | null
  group_number: number | null
  shelf_number: number | null
  location_code: string | null
  parent_group_id: string | null
  parent_group?: InventoryGroupDTO | null
  group_children?: InventoryGroupDTO[]
  created_at: Date
  updated_at: Date
}

export interface CreateInventoryGroupDTO {
  name: string
  handle?: string | null
  description?: string | null
  is_active?: boolean
  rank?: number
  metadata?: Record<string, unknown> | null
  type?: string | null
  zone_code?: string | null
  aisle_number?: number | null
  group_number?: number | null
  shelf_number?: number | null
  location_code?: string | null
  parent_group_id?: string | null
  parent_group?: { id: string }
}

export interface UpdateInventoryGroupDTO {
  name?: string
  handle?: string | null
  description?: string | null
  is_active?: boolean
  rank?: number
  metadata?: Record<string, unknown> | null
  type?: string | null
  zone_code?: string | null
  aisle_number?: number | null
  group_number?: number | null
  shelf_number?: number | null
  location_code?: string | null
  parent_group_id?: string | null
}

export interface UpdateGroupInput extends UpdateInventoryGroupDTO {
  id: string
  mpath?: string
  group_children?: UpdateGroupInput[]
}

export interface FilterableInventoryGroupProps {
  id?: string | string[]
  name?: string | string[]
  handle?: string | string[]
  type?: string | string[]
  zone_code?: string | string[]
  parent_group_id?: string | string[] | null
  is_active?: boolean
  q?: string
  include_descendants_tree?: boolean
  include_ancestors_tree?: boolean
}

export interface InventoryGroupTransformOptions {
  includeDescendantsTree?: boolean
  includeAncestorsTree?: boolean
}

// Utility functions
export function generateLocationCode(
  zoneCode: string | null,
  aisleNumber: number | null,
  groupNumber: number | null,
  shelfNumber: number | null
): string | null {
  if (!zoneCode) return null

  let code = zoneCode
  if (aisleNumber != null) {
    code += String(aisleNumber).padStart(2, "0")
  }
  if (groupNumber != null) {
    code += `-${String(groupNumber).padStart(2, "0")}`
  }
  if (shelfNumber != null) {
    code += `-${shelfNumber}`
  }
  return code
}

export function generateHandle(
  type: string | null | undefined,
  zoneCode: string | null,
  aisleNumber: number | null,
  groupNumber: number | null,
  shelfNumber: number | null
): string {
  const parts: string[] = []
  if (zoneCode) {
    parts.push(zoneCode.toLowerCase())
  }
  if (aisleNumber != null) {
    parts.push(String(aisleNumber).padStart(2, "0"))
  }
  if (groupNumber != null) {
    parts.push(String(groupNumber).padStart(2, "0"))
  }
  if (shelfNumber != null) {
    parts.push(String(shelfNumber))
  }
  return parts.join("-") || type || "group"
}

export function parseLocationCode(locationCode: string | null): {
  zone_code: string | null
  aisle_number: number | null
  group_number: number | null
  shelf_number: number | null
} {
  const result = {
    zone_code: null as string | null,
    aisle_number: null as number | null,
    group_number: null as number | null,
    shelf_number: null as number | null,
  }

  if (!locationCode) return result

  // Parse zone (first character)
  const zoneMatch = locationCode.match(/^([ARF])/)
  if (zoneMatch) {
    result.zone_code = zoneMatch[1]
  }

  // Parse aisle (next two digits)
  const aisleMatch = locationCode.match(/^[ARF](\d{2})/)
  if (aisleMatch) {
    result.aisle_number = parseInt(aisleMatch[1], 10)
  }

  // Parse group (after first hyphen)
  const groupMatch = locationCode.match(/-(\d{2})-/)
  if (groupMatch) {
    result.group_number = parseInt(groupMatch[1], 10)
  }

  // Parse shelf (after last hyphen)
  const shelfMatch = locationCode.match(/-(\d)$/)
  if (shelfMatch) {
    result.shelf_number = parseInt(shelfMatch[1], 10)
  }

  return result
}

