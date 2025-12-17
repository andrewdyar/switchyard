import { Migration } from "@switchyard/framework/mikro-orm/migrations"

export class Migration20250120000003_CreateAlertNotificationAssignmentsTable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "alert_notification_assignments" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "alert_type" TEXT NOT NULL,
        "notification_channels" TEXT[] NOT NULL,
        "equipment_id" TEXT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "alert_notification_assignments_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_alert_notifications_user" 
      ON "alert_notification_assignments" ("user_id") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_alert_notifications_type" 
      ON "alert_notification_assignments" ("alert_type") 
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_alert_notifications_equipment" 
      ON "alert_notification_assignments" ("equipment_id") 
      WHERE "equipment_id IS NOT NULL" AND "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "alert_notification_assignments";`)
  }
}
