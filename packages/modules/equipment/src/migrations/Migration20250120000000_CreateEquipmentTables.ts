import { Migration } from "@switchyard/framework/mikro-orm/migrations"

export class Migration20250120000000_CreateEquipmentTables extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "equipment" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "inventory_group_id" TEXT NULL,
        "swift_collector_id" INTEGER NULL,
        "swift_device_id" INTEGER NULL,
        "swift_sensor_id_temperature" INTEGER NULL,
        "swift_sensor_id_humidity" INTEGER NULL,
        "metadata" JSONB NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "equipment_thresholds" (
        "id" TEXT NOT NULL,
        "equipment_id" TEXT NOT NULL,
        "measurement_type" TEXT NOT NULL,
        "low_critical" DECIMAL(10,2) NULL,
        "low_warning" DECIMAL(10,2) NULL,
        "high_warning" DECIMAL(10,2) NULL,
        "high_critical" DECIMAL(10,2) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "equipment_thresholds_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_type" 
      ON "equipment" ("type") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_inventory_group" 
      ON "equipment" ("inventory_group_id") 
      WHERE "inventory_group_id IS NOT NULL" AND "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_active" 
      ON "equipment" ("is_active") 
      WHERE "is_active = true" AND "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_thresholds_equipment" 
      ON "equipment_thresholds" ("equipment_id") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_equipment_thresholds_type" 
      ON "equipment_thresholds" ("equipment_id", "measurement_type") 
      WHERE "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "equipment_thresholds";`)
    this.addSql(`DROP TABLE IF EXISTS "equipment";`)
  }
}
