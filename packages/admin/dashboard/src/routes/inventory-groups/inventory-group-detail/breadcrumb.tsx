import { UIMatch } from "react-router-dom"
import { Link } from "react-router-dom"
import { useInventoryGroup } from "../../../hooks/api/inventory-groups"

type InventoryGroupDetailBreadcrumbProps = UIMatch

// Zone names mapping
const ZONE_NAMES: Record<string, string> = {
  A: "Ambient",
  R: "Refrigerated",
  F: "Frozen",
}

// Format name for display (e.g., "Aisle 02", "Bay 21", "Slot 05")
const formatGroupName = (item: any): string => {
  if (!item) return "Unknown"
  
  if (item.type === "zone" && item.zone_code) {
    return ZONE_NAMES[item.zone_code] || item.name || "Zone"
  }
  if (item.type === "aisle" && item.aisle_number != null) {
    return `Aisle ${String(item.aisle_number).padStart(2, "0")}`
  }
  if (item.type === "bay" && item.bay_number != null) {
    return `Bay ${String(item.bay_number).padStart(2, "0")}`
  }
  if (item.type === "shelf" && item.shelf_number != null) {
    return `Shelf ${item.shelf_number}`
  }
  if (item.type === "slot" && item.slot_number != null) {
    return `Slot ${String(item.slot_number).padStart(2, "0")}`
  }
  return item.name || "Location"
}

// Build breadcrumb path from ancestor chain
const buildBreadcrumbPath = (group: any): any[] => {
  if (!group) return []

  const path: any[] = []

  // Recursively build path from ancestors (parent first)
  const buildPath = (g: any) => {
    if (!g) return

    // If this group has a parent, add parent first
    if (g.parent_group) {
      buildPath(g.parent_group)
    }

    // Add current group to path
    path.push({
      id: g.id,
      name: g.name,
      type: g.type,
      zone_code: g.zone_code,
      aisle_number: g.aisle_number,
      bay_number: g.bay_number,
      shelf_number: g.shelf_number,
      slot_number: g.slot_number,
    })
  }

  buildPath(group)
  return path
}

export const InventoryGroupDetailBreadcrumb = (
  props: InventoryGroupDetailBreadcrumbProps
) => {
  const { id } = props.params || {}

  // Always show something - never return null
  if (!id) {
    return <span>Location</span>
  }

  // Fetch the inventory group with ancestor tree
  const result = useInventoryGroup(
    id,
    {
      include_ancestors_tree: true,
      fields: "id,name,type,zone_code,aisle_number,bay_number,shelf_number,slot_number,parent_group_id,*parent_group",
    },
    {
      enabled: true,
    }
  )

  // Get inventory_group from result
  const inventory_group = result?.inventory_group

  // Show ID as fallback while loading - never return null
  if (!inventory_group) {
    return <span>{id.slice(0, 8)}...</span>
  }

  // Build the breadcrumb path from ancestors
  const path = buildBreadcrumbPath(inventory_group)

  // If no path or single item, just show the formatted name
  if (path.length <= 1) {
    return <span>{formatGroupName(inventory_group)}</span>
  }

  // Render breadcrumb path with links for ancestors
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {path.map((item, index) => {
        const isLast = index === path.length - 1
        const displayName = formatGroupName(item)

        if (isLast) {
          return <span key={item.id || index}>{displayName}</span>
        }

        return (
          <span key={item.id || index} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Link
              to={`/groups/${item.id}`}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            >
              {displayName}
            </Link>
            <span className="text-ui-fg-muted">/</span>
          </span>
        )
      })}
    </span>
  )
}
