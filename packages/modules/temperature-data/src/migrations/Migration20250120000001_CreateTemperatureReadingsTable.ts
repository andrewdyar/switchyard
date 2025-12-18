import { Migration } from "@mikro-orm/migrations"

export class Migration20250120000001_CreateTemperatureReadingsTable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "temperature_readings" (
        "id" TEXT NOT NULL,
        "equipment_id" TEXT NOT NULL,
        "sensor_id" INTEGER NOT NULL,
        "measurement_type" TEXT NOT NULL,
        "value" DECIMAL NOT NULL,
        "unit" TEXT NOT NULL,
        "threshold_status" INTEGER,
        "recorded_at" TIMESTAMPTZ NOT NULL,
        "swift_timestamp" BIGINT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "temperature_readings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "temperature_readings_equipment_fkey" 
          FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE
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
