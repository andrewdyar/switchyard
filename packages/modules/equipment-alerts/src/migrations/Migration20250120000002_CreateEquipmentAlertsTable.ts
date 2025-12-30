import { Migration } from "@switchyard/framework/mikro-orm/migrations"

export class Migration20250120000002_CreateEquipmentAlertsTable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "equipment_alerts" (
        "id" TEXT NOT NULL,
        "equipment_id" TEXT NOT NULL,
        "alert_type" TEXT NOT NULL,
        "severity" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "current_value" DECIMAL,
        "threshold_value" DECIMAL,
        "message" TEXT,
        "resolved_at" TIMESTAMPTZ,
        "resolved_by" TEXT,
        "resolved_reason" TEXT,
        "triggered_at" TIMESTAMPTZ NOT NULL,
        "deleted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "equipment_alerts_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "equipment_alerts_equipment_fkey" 
          FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_equipment" 
      ON "equipment_alerts" ("equipment_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_status" 
      ON "equipment_alerts" ("status");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_type" 
      ON "equipment_alerts" ("alert_type");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_triggered" 
      ON "equipment_alerts" ("triggered_at");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "equipment_alerts";`)
  }
}



