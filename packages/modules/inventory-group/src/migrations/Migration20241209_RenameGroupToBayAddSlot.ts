import { Migration } from "@mikro-orm/migrations"

/**
 * Migration: Rename group_number to bay_number, level to type, and add slot_number
 *
 * Schema changes:
 * - Rename column: level → type
 * - Rename column: group_number → bay_number  
 * - Add column: slot_number (integer, nullable)
 * - Update indexes: level → type
 * - Update unique constraint: location_code unique where type='slot' instead of level='shelf'
 *
 * New hierarchy: Zone > Aisle > Bay > Shelf > Slot
 * Slot numbering per bay (20 slots, 4 per shelf):
 * - Slots 01-04: Shelf 5 (top)
 * - Slots 05-08: Shelf 4
 * - Slots 09-12: Shelf 3
 * - Slots 13-16: Shelf 2
 * - Slots 17-20: Shelf 1 (bottom)
 */
export class Migration20241209_RenameGroupToBayAddSlot extends Migration {
  async up(): Promise<void> {
    // Drop old indexes that reference 'level'
    this.addSql(`DROP INDEX IF EXISTS "IDX_inventory_groups_level";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_inventory_groups_location_code_unique";`)

    // Rename level to type
    this.addSql(`ALTER TABLE "inventory_groups" RENAME COLUMN "level" TO "type";`)

    // Rename group_number to bay_number
    this.addSql(`ALTER TABLE "inventory_groups" RENAME COLUMN "group_number" TO "bay_number";`)

    // Add slot_number column
    this.addSql(`ALTER TABLE "inventory_groups" ADD COLUMN "slot_number" integer NULL;`)

    // Create new indexes with updated column names
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_groups_type" ON "inventory_groups" ("type") WHERE deleted_at IS NULL;`)
    
    // Update unique constraint for location_code - now unique for 'slot' type
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_inventory_groups_location_code_unique" ON "inventory_groups" ("location_code") WHERE deleted_at IS NULL AND type = 'slot';`)

    // Update existing 'group' type records to 'bay'
    this.addSql(`UPDATE "inventory_groups" SET type = 'bay' WHERE type = 'group';`)
  }

  async down(): Promise<void> {
    // Drop new indexes
    this.addSql(`DROP INDEX IF EXISTS "IDX_inventory_groups_type";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_inventory_groups_location_code_unique";`)

    // Revert 'bay' type back to 'group'
    this.addSql(`UPDATE "inventory_groups" SET type = 'group' WHERE type = 'bay';`)

    // Drop slot_number column
    this.addSql(`ALTER TABLE "inventory_groups" DROP COLUMN "slot_number";`)

    // Rename bay_number back to group_number
    this.addSql(`ALTER TABLE "inventory_groups" RENAME COLUMN "bay_number" TO "group_number";`)

    // Rename type back to level
    this.addSql(`ALTER TABLE "inventory_groups" RENAME COLUMN "type" TO "level";`)

    // Recreate old indexes
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inventory_groups_level" ON "inventory_groups" ("level") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_inventory_groups_location_code_unique" ON "inventory_groups" ("location_code") WHERE deleted_at IS NULL AND level = 'shelf';`)
  }
}



