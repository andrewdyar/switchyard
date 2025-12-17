# Equipment Monitoring Setup Guide

This guide explains how to set up and configure the Swift Sensors equipment monitoring system for your refrigeration units.

## Prerequisites

- Swift Sensors account with API access
- Swift Sensors API key (contact support@swiftsensors.com)
- Swift Sensors hardware installed and configured
- Environment variables configured (see below)

## Environment Variables

Add these to your `.env` file:

```env
# Swift Sensors API Configuration
SWIFT_SENSORS_API_KEY=your_api_key_here
SWIFT_SENSORS_EMAIL=your_email@example.com
SWIFT_SENSORS_PASSWORD=your_password_here
SWIFT_SENSORS_ACCOUNT_ID=.12345.
```

## Module Registration

The equipment monitoring modules need to be registered in your `switchyard.config.ts`:

```typescript
modules: [
  {
    resolve: "@switchyard/equipment",
  },
  {
    resolve: "@switchyard/temperature-data",
  },
  {
    resolve: "@switchyard/equipment-alerts",
  },
  {
    resolve: "@switchyard/equipment-notifications",
  },
  // ... other modules
]
```

## Database Migrations

Run migrations to create the required tables:

```bash
# The migrations will be automatically detected and run
npm run migration:run
```

This will create:
- `equipment` table
- `equipment_thresholds` table
- `temperature_readings` table
- `equipment_alerts` table
- `alert_notification_assignments` table

## Initial Setup Steps

### 1. Create Equipment Records

For each of your 10 fridges and 10 freezers, create an equipment record via the admin API or UI:

```bash
POST /admin/equipment
{
  "name": "Freezer 1",
  "type": "freezer",
  "inventory_group_id": "your-inventory-group-id", // Optional
  "is_active": true
}
```

### 2. Pair Sensors

Once your Swift Sensors hardware is installed and you have the sensor IDs, update the equipment records:

```bash
PATCH /admin/equipment/{equipment_id}
{
  "swift_collector_id": 123,
  "swift_device_id": 456,
  "swift_sensor_id_temperature": 789,
  "swift_sensor_id_humidity": 790  // Optional
}
```

### 3. Configure Thresholds

Set temperature and humidity thresholds for each piece of equipment:

```bash
POST /admin/equipment/{equipment_id}/thresholds  # Via equipment service
{
  "equipment_id": "equipment-uuid",
  "measurement_type": "temperature",
  "low_critical": 0,      // Freezer: 0°F
  "low_warning": 5,       // Freezer: 5°F
  "high_warning": 10,     // Freezer: 10°F
  "high_critical": 15     // Freezer: 15°F
}
```

### 4. Configure Notification Assignments

Assign users to receive alerts for specific alert types:

```bash
POST /admin/equipment/notification-assignments
{
  "user_id": "user-uuid",
  "alert_type": "temperature_high",
  "notification_channels": ["email", "in_app"],
  "equipment_id": null  // null = all equipment
}
```

## Background Sync

The system automatically syncs data from Swift Sensors API every 5 minutes. The sync workflow:

1. Fetches latest sensor readings
2. Stores them in Supabase `temperature_readings` table
3. Checks thresholds and creates alerts
4. Sends notifications to assigned users

## Admin Dashboard

Access the equipment monitoring dashboard at:
- `/equipment/refrigeration` - Main monitoring dashboard

Features:
- **Equipment Monitoring Tab**: View all equipment cards with current temperature/humidity
- **Active Alerts Section**: See and resolve active alerts
- **Equipment Detail Modal**: View historical charts and alert history
- **Notifications Tab**: Manage user alert assignments
- **Historical Reports Tab**: Generate PDF/CSV reports

## API Endpoints

### Equipment
- `GET /admin/equipment` - List equipment
- `POST /admin/equipment` - Create equipment
- `GET /admin/equipment/:id` - Get equipment details
- `PATCH /admin/equipment/:id` - Update equipment
- `DELETE /admin/equipment/:id` - Delete equipment

### Alerts
- `GET /admin/equipment/alerts` - List alerts
- `PATCH /admin/equipment/alerts/:id/resolve` - Resolve alert
- `PATCH /admin/equipment/alerts/:id/acknowledge` - Acknowledge alert

### Time Series Data
- `GET /admin/equipment/:id/time-series` - Get historical readings

### Reports
- `GET /admin/equipment/reports` - Generate PDF or CSV report

## Troubleshooting

### No data appearing
- Check that `SWIFT_SENSORS_ACCOUNT_ID` is correct
- Verify equipment records have `swift_sensor_id_temperature` set
- Check background sync logs for errors

### Alerts not triggering
- Verify thresholds are configured for equipment
- Check that sensors are reporting data (check Swift Sensors dashboard)
- Review alert detection logs

### Notifications not sending
- Verify notification assignments are created
- Check that users have email/SMS configured
- Review notification service logs

## Next Steps

Once sensors are installed:
1. Create all 20 equipment records (10 fridges + 10 freezers)
2. Pair Swift Sensors IDs to equipment records
3. Configure temperature/humidity thresholds
4. Assign users to receive alerts
5. Monitor the dashboard for data flow
