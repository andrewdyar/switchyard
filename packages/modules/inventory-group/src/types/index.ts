/**
 * Types for Inventory Group Module
 *
 * Hierarchy: Zone > Aisle > Bay > Shelf > Slot
 *
 * Slot numbering within a bay (20 slots per bay, 4 slots per shelf):
 * - Slots 01-04: Shelf 5 (top)
 * - Slots 05-08: Shelf 4
 * - Slots 09-12: Shelf 3
 * - Slots 13-16: Shelf 2
 * - Slots 17-20: Shelf 1 (bottom)
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

export const BAY_LIMITS = { min: 1, max: 22 }
export const SHELF_LIMITS = { min: 1, max: 5 }
export const SLOT_LIMITS = { min: 1, max: 20 }
export const SLOTS_PER_SHELF = 4

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
  bay_number: number | null
  shelf_number: number | null
  slot_number: number | null
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
  bay_number?: number | null
  shelf_number?: number | null
  slot_number?: number | null
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
  bay_number?: number | null
  shelf_number?: number | null
  slot_number?: number | null
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

/**
 * Get the shelf number (1-5) from a slot number (1-20)
 * Slots 1-4 → Shelf 5, Slots 5-8 → Shelf 4, etc.
 */
export function getShelfFromSlot(slotNumber: number): number {
  if (slotNumber < 1 || slotNumber > 20) {
    throw new Error(`Invalid slot number: ${slotNumber}. Must be 1-20.`)
  }
  // Slots 1-4 → Shelf 5, Slots 5-8 → Shelf 4, etc.
  return 5 - Math.floor((slotNumber - 1) / SLOTS_PER_SHELF)
}

/**
 * Get the slot position (1-4) within its shelf from a slot number (1-20)
 */
export function getSlotPositionOnShelf(slotNumber: number): number {
  if (slotNumber < 1 || slotNumber > 20) {
    throw new Error(`Invalid slot number: ${slotNumber}. Must be 1-20.`)
  }
  return ((slotNumber - 1) % SLOTS_PER_SHELF) + 1
}

/**
 * Get the slot number (1-20) from shelf number (1-5) and position (1-4)
 */
export function getSlotNumber(shelfNumber: number, positionOnShelf: number): number {
  if (shelfNumber < 1 || shelfNumber > 5) {
    throw new Error(`Invalid shelf number: ${shelfNumber}. Must be 1-5.`)
  }
  if (positionOnShelf < 1 || positionOnShelf > 4) {
    throw new Error(`Invalid position on shelf: ${positionOnShelf}. Must be 1-4.`)
  }
  // Shelf 5 → slots 1-4, Shelf 4 → slots 5-8, etc.
  const baseSlot = (5 - shelfNumber) * SLOTS_PER_SHELF
  return baseSlot + positionOnShelf
}

// Utility functions
export function generateLocationCode(
  zoneCode: string | null,
  aisleNumber: number | null,
  bayNumber: number | null,
  shelfNumber: number | null,
  slotNumber: number | null = null
): string | null {
  if (!zoneCode) return null

  let code = zoneCode
  if (aisleNumber != null) {
    code += String(aisleNumber).padStart(2, "0")
  }
  if (bayNumber != null) {
    code += `-${String(bayNumber).padStart(2, "0")}`
  }
  if (shelfNumber != null) {
    code += `-${shelfNumber}`
  }
  if (slotNumber != null) {
    code += `-${String(slotNumber).padStart(2, "0")}`
  }
  return code
}

export function generateHandle(
  type: string | null | undefined,
  zoneCode: string | null,
  aisleNumber: number | null,
  bayNumber: number | null,
  shelfNumber: number | null,
  slotNumber: number | null = null
): string {
  const parts: string[] = []
  if (zoneCode) {
    parts.push(zoneCode.toLowerCase())
  }
  if (aisleNumber != null) {
    parts.push(String(aisleNumber).padStart(2, "0"))
  }
  if (bayNumber != null) {
    parts.push(String(bayNumber).padStart(2, "0"))
  }
  if (shelfNumber != null) {
    parts.push(String(shelfNumber))
  }
  if (slotNumber != null) {
    parts.push(String(slotNumber).padStart(2, "0"))
  }
  return parts.join("-") || type || "group"
}

export function parseLocationCode(locationCode: string | null): {
  zone_code: string | null
  aisle_number: number | null
  bay_number: number | null
  shelf_number: number | null
  slot_number: number | null
} {
  const result = {
    zone_code: null as string | null,
    aisle_number: null as number | null,
    bay_number: null as number | null,
    shelf_number: null as number | null,
    slot_number: null as number | null,
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

  // Split by hyphens for bay, shelf, slot
  const parts = locationCode.split("-")
  
  // Parse bay (first hyphen segment, 2 digits)
  if (parts.length >= 2 && parts[1]) {
    const bayNum = parseInt(parts[1], 10)
    if (!isNaN(bayNum)) {
      result.bay_number = bayNum
    }
  }

  // Parse shelf (second hyphen segment, 1 digit)
  if (parts.length >= 3 && parts[2]) {
    const shelfNum = parseInt(parts[2], 10)
    if (!isNaN(shelfNum) && shelfNum >= 1 && shelfNum <= 5) {
      result.shelf_number = shelfNum
    }
  }

  // Parse slot (third hyphen segment, 2 digits)
  if (parts.length >= 4 && parts[3]) {
    const slotNum = parseInt(parts[3], 10)
    if (!isNaN(slotNum) && slotNum >= 1 && slotNum <= 20) {
      result.slot_number = slotNum
    }
  }

  return result
}

