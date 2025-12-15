export const defaults = [
  "id",
  "name",
  "description",
  "handle",
  "is_active",
  "rank",
  "mpath",
  "type",
  "level", // alias for type
  "zone_code",
  "aisle_number",
  "bay_number",
  "shelf_number",
  "slot_number",
  "location_code",
  "parent_group_id",
  "created_at",
  "updated_at",
  "metadata",
  "*parent_group",
  "*group_children",
]

export const allowed = [
  "id",
  "name",
  "description",
  "handle",
  "is_active",
  "rank",
  "mpath",
  "type",
  "level", // alias for type
  "zone_code",
  "aisle_number",
  "bay_number",
  "shelf_number",
  "slot_number",
  "location_code",
  "parent_group_id",
  "created_at",
  "updated_at",
  "metadata",
  "group_children",
  "parent_group",
  "products",
]

export const retrieveInventoryGroupConfig = {
  defaults,
  allowed,
  isList: false,
}

export const listInventoryGroupConfig = {
  defaults,
  allowed,
  defaultLimit: 50,
  isList: true,
}

