export type InventoryGroupLevel = "zone" | "aisle" | "group" | "shelf"
export type ZoneCode = "A" | "R" | "F"

export type InventoryGroupTreeItem = {
  id: string
  name: string
  handle: string | null
  parent_group_id: string | null
  group_children: InventoryGroupTreeItem[] | null
  rank: number | null
  level: InventoryGroupLevel
  zone_code: ZoneCode | null
  aisle_number: number | null
  group_number: number | null
  shelf_number: number | null
  location_code: string | null
  is_active: boolean
}

export const ZONE_NAMES: Record<ZoneCode, string> = {
  A: "Ambient",
  R: "Refrigerated",
  F: "Frozen",
}

// Zone colors for badges and status cells
export const ZONE_COLORS: Record<ZoneCode, string> = {
  A: "orange", // Ambient - orange
  R: "blue", // Refrigerated - blue
  F: "grey", // Frozen - will be styled with custom CSS for white/black
}

// Get badge color for zone - returns a Badge color prop value
export const getZoneBadgeColor = (
  zoneCode: ZoneCode
): "orange" | "blue" | "grey" => {
  return ZONE_COLORS[zoneCode] as "orange" | "blue" | "grey"
}

// Get the CSS color for zone status cells
export const getZoneStatusColor = (zoneCode: ZoneCode): string => {
  switch (zoneCode) {
    case "A":
      return "bg-orange-500"
    case "R":
      return "bg-blue-400"
    case "F":
      return "bg-gray-600 dark:bg-blue-100"
    default:
      return "bg-gray-400"
  }
}

export const ZONE_OPTIONS: { value: ZoneCode; label: string }[] = [
  { value: "A", label: "Ambient" },
  { value: "R", label: "Refrigerated" },
  { value: "F", label: "Frozen" },
]

export const LEVEL_OPTIONS: { value: InventoryGroupLevel; label: string }[] = [
  { value: "zone", label: "Zone" },
  { value: "aisle", label: "Aisle" },
  { value: "group", label: "Group" },
  { value: "shelf", label: "Shelf" },
]

export const ZONE_AISLE_LIMITS: Record<
  ZoneCode,
  { min: number; max: number }
> = {
  A: { min: 1, max: 12 },
  R: { min: 1, max: 4 },
  F: { min: 1, max: 2 },
}

export const GROUP_LIMITS = { min: 1, max: 22 }
export const SHELF_LIMITS = { min: 1, max: 5 }

