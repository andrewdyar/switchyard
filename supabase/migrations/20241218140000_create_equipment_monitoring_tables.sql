-- Equipment Monitoring System Tables
-- Migration for Swift Sensors integration

-- Equipment table - stores refrigeration units (fridges, freezers, etc.)
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

CREATE INDEX IF NOT EXISTS "IDX_equipment_type" ON "equipment" ("type");
CREATE INDEX IF NOT EXISTS "IDX_equipment_inventory_group" ON "equipment" ("inventory_group_id") WHERE "inventory_group_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_equipment_active" ON "equipment" ("is_active") WHERE "is_active" = true;

-- Equipment thresholds table - custom alert thresholds per equipment
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
  CONSTRAINT "equipment_thresholds_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_equipment_threshold_equipment" ON "equipment_thresholds" ("equipment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_equipment_threshold_type" ON "equipment_thresholds" ("equipment_id", "measurement_type") WHERE "deleted_at" IS NULL;

-- Temperature readings table - time-series data from sensors
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
  CONSTRAINT "temperature_readings_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_temperature_readings_equipment_recorded" ON "temperature_readings" ("equipment_id", "recorded_at");
CREATE INDEX IF NOT EXISTS "IDX_temperature_readings_sensor_recorded" ON "temperature_readings" ("sensor_id", "recorded_at");
CREATE INDEX IF NOT EXISTS "IDX_temperature_readings_type" ON "temperature_readings" ("equipment_id", "measurement_type", "recorded_at");

-- Equipment alerts table - tracks alert events
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
  CONSTRAINT "equipment_alerts_equipment_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_equipment" ON "equipment_alerts" ("equipment_id");
CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_status" ON "equipment_alerts" ("status");
CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_type" ON "equipment_alerts" ("alert_type");
CREATE INDEX IF NOT EXISTS "IDX_equipment_alerts_triggered" ON "equipment_alerts" ("triggered_at");

-- Alert notification assignments table - user notification preferences
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

CREATE INDEX IF NOT EXISTS "IDX_alert_assignment_user" ON "alert_notification_assignments" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_alert_assignment_type" ON "alert_notification_assignments" ("alert_type");
CREATE INDEX IF NOT EXISTS "IDX_alert_assignment_user_type" ON "alert_notification_assignments" ("user_id", "alert_type") WHERE "deleted_at" IS NULL;

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE "equipment" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "equipment_thresholds" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "temperature_readings" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "equipment_alerts" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "alert_notification_assignments" ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE "equipment" IS 'Refrigeration and other equipment units monitored by Swift Sensors';
COMMENT ON TABLE "equipment_thresholds" IS 'Custom temperature/humidity alert thresholds per equipment unit';
COMMENT ON TABLE "temperature_readings" IS 'Historical temperature and humidity readings from sensors';
COMMENT ON TABLE "equipment_alerts" IS 'Alert events triggered by threshold violations or connectivity issues';
COMMENT ON TABLE "alert_notification_assignments" IS 'User assignments for receiving specific alert type notifications';



