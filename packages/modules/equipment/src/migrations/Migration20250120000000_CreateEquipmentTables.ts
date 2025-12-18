import { Migration } from "@mikro-orm/migrations"

export class Migration20250120000000_CreateEquipmentTables extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "equipment" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "inventory_group_id" TEXT,
        "swift_collector_id" INTEGER,
        "swift_device_id" INTEGER,
        "swift_sensor_id_temperature" INTEGER,
        "swift_sensor_id_humidity" INTEGER,
        "metadata" JSONB,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "deleted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_type" ON "equipment" ("type");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_inventory_group" 
      ON "equipment" ("inventory_group_id") 
      WHERE "inventory_group_id" IS NOT NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_active" 
      ON "equipment" ("is_active") 
      WHERE "is_active" = true;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "equipment_thresholds" (
        "id" TEXT NOT NULL,
        "equipment_id" TEXT NOT NULL,
        "measurement_type" TEXT NOT NULL,
        "low_critical" DECIMAL,
        "low_warning" DECIMAL,
        "high_warning" DECIMAL,
        "high_critical" DECIMAL,
        "deleted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "equipment_thresholds_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "equipment_thresholds_equipment_fkey" 
          FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_threshold_equipment" 
      ON "equipment_thresholds" ("equipment_id");
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_equipment_threshold_type" 
      ON "equipment_thresholds" ("equipment_id", "measurement_type") 
      WHERE "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "equipment_thresholds";`)
    this.addSql(`DROP TABLE IF EXISTS "equipment";`)
  }
}
