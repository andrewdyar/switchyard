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
        "current_value" DECIMAL(10,2) NULL,
        "threshold_value" DECIMAL(10,2) NULL,
        "message" TEXT NULL,
        "resolved_at" TIMESTAMPTZ NULL,
        "resolved_by" TEXT NULL,
        "resolved_reason" TEXT NULL,
        "triggered_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "equipment_alerts_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_equipment" 
      ON "equipment_alerts" ("equipment_id") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_status" 
      ON "equipment_alerts" ("status") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_type" 
      ON "equipment_alerts" ("alert_type") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_triggered" 
      ON "equipment_alerts" ("triggered_at") 
      WHERE "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "equipment_alerts";`)
  }
}
