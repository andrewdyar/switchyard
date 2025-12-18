import { Migration } from "@mikro-orm/migrations"

export class Migration20250120000003_CreateAlertNotificationAssignmentsTable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "alert_notification_assignments" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "alert_type" TEXT NOT NULL,
        "notification_channels" TEXT[] NOT NULL,
        "equipment_id" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "deleted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "alert_notification_assignments_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_alert_assignment_user" 
      ON "alert_notification_assignments" ("user_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_alert_assignment_type" 
      ON "alert_notification_assignments" ("alert_type");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_alert_assignment_user_type" 
      ON "alert_notification_assignments" ("user_id", "alert_type") 
      WHERE "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "alert_notification_assignments";`)
  }
}
