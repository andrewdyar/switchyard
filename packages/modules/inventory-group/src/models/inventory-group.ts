/**
 * Inventory Group Model
 *
 * Represents hierarchical warehouse locations for products.
 * Hierarchy: Zone > Aisle > Bay > Shelf > Slot
 *
 * Location code format: {Zone}{Aisle}-{Bay}-{Shelf}-{Slot}
 * Example: A03-07-3-05 (Ambient Zone, Aisle 03, Bay 07, Shelf 3, Slot 05)
 *
 * Slot numbering within a bay (20 slots per bay, 4 slots per shelf):
 * - Slots 01-04: Shelf 5 (top)
 * - Slots 05-08: Shelf 4
 * - Slots 09-12: Shelf 3
 * - Slots 13-16: Shelf 2
 * - Slots 17-20: Shelf 1 (bottom)
 */
import { model } from "@switchyard/framework/utils"

const InventoryGroup = model
  .define(
    {
      tableName: "inventory_groups",
      name: "InventoryGroup",
    },
    {
      // UUID primary key
      id: model.id().primaryKey(),
      // Display name (e.g., "Ambient", "Aisle 03", "Bay 07", "Shelf 3", "Slot 05")
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
      // Type in hierarchy: 'zone', 'aisle', 'bay', 'shelf', 'slot'
      type: model.text().nullable(),
      // Zone code: 'A' (Ambient), 'R' (Refrigerated), 'F' (Frozen)
      zone_code: model.text().nullable(),
      // Aisle number: 1-12 (Ambient), 1-4 (Refrigerated), 1-2 (Frozen)
      aisle_number: model.number().nullable(),
      // Bay number: 1-22 (all zones) - formerly "group"
      bay_number: model.number().nullable(),
      // Shelf number: 1-5 (all zones)
      shelf_number: model.number().nullable(),
      // Slot number: 1-20 within each bay (4 slots per shelf)
      // Slots 1-4 on shelf 5, 5-8 on shelf 4, 9-12 on shelf 3, 13-16 on shelf 2, 17-20 on shelf 1
      slot_number: model.number().nullable(),
      // Full location code (e.g., "A03-07-3-05")
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
      where: "deleted_at IS NULL AND type = 'slot'",
    },
  ])

export default InventoryGroup

