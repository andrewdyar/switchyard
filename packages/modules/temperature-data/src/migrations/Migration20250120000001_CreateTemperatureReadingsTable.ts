import { Migration } from "@switchyard/framework/mikro-orm/migrations"

export class Migration20250120000001_CreateTemperatureReadingsTable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "temperature_readings" (
        "id" TEXT NOT NULL,
        "equipment_id" TEXT NOT NULL,
        "sensor_id" INTEGER NOT NULL,
        "measurement_type" TEXT NOT NULL,
        "value" DECIMAL(10,2) NOT NULL,
        "unit" TEXT NOT NULL,
        "threshold_status" INTEGER NULL,
        "recorded_at" TIMESTAMPTZ NOT NULL,
        "swift_timestamp" BIGINT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "temperature_readings_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_temperature_readings_equipment_recorded" 
      ON "temperature_readings" ("equipment_id", "recorded_at");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_temperature_readings_sensor_recorded" 
      ON "temperature_readings" ("sensor_id", "recorded_at");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_temperature_readings_type" 
      ON "temperature_readings" ("equipment_id", "measurement_type", "recorded_at");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "temperature_readings";`)
  }
}
