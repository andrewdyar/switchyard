/**
 * Inventory Group Model
 *
 * Represents hierarchical warehouse locations for products.
 * Hierarchy: Zone > Aisle > Group > Shelf
 *
 * Location code format: {Zone}{Aisle}-{Group}-{Shelf}
 * Example: A03-07-3 (Ambient Zone, Aisle 03, Group 07, Shelf 3)
 */
import { model } from "@medusajs/framework/utils"

const InventoryGroup = model
  .define(
    {
      tableName: "inventory_groups",
      name: "InventoryGroup",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      // Display name (e.g., "Ambient", "Aisle 03", "Group 07", "Shelf 3")
      name: model.text().searchable(),
      // URL-friendly handle
      handle: model.text().searchable().nullable(),
      // Description
      description: model.text().searchable().nullable(),
      // Materialized path for hierarchy traversal
      mpath: model.text().nullable(),
      // Is this location active?
      is_active: model.boolean().default(true),
      // Display rank/order within siblings
      rank: model.number().default(0),
      // Metadata (JSON)
      metadata: model.json().nullable(),

      // ---- Location-specific fields ----
      // Type in hierarchy: 'zone', 'aisle', 'group', 'shelf'
      type: model.text().nullable(),
      // Zone code: 'A' (Ambient), 'R' (Refrigerated), 'F' (Frozen)
      zone_code: model.text().nullable(),
      // Aisle number: 1-12 (Ambient), 1-4 (Refrigerated), 1-2 (Frozen)
      aisle_number: model.number().nullable(),
      // Group number: 1-22 (all zones)
      group_number: model.number().nullable(),
      // Shelf number: 1-5 (all zones)
      shelf_number: model.number().nullable(),
      // Full location code (e.g., "A03-07-3")
      location_code: model.text().nullable(),

      // ---- Relationships ----
      // Parent group (self-referential for hierarchy)
      parent_group: model
        .belongsTo(() => InventoryGroup, {
          mappedBy: "group_children",
        })
        .nullable(),
      // Child groups
      group_children: model.hasMany(() => InventoryGroup, {
        mappedBy: "parent_group",
      }),
    }
  )
  .cascades({
    delete: ["group_children"],
  })
  .indexes([
    {
      name: "IDX_inventory_groups_mpath",
      on: ["mpath"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_groups_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_groups_type",
      on: ["type"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_groups_zone_code",
      on: ["zone_code"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_groups_parent_group_id",
      on: ["parent_group_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_inventory_groups_location_code_unique",
      on: ["location_code"],
      unique: true,
      where: "deleted_at IS NULL AND type = 'shelf'",
    },
  ])

export default InventoryGroup

