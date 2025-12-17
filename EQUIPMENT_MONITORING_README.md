# Swift Sensors Equipment Monitoring System

## Overview

Complete temperature and humidity monitoring system integrated with Swift Sensors API for 20 refrigeration units (10 fridges + 10 freezers). The system provides real-time monitoring, alerting, notifications, and historical reporting.

## What's Been Built

### ✅ Backend Infrastructure

1. **Swift Sensors API Client** (`@switchyard/providers-swift-sensors`)
   - Authentication with token refresh
   - Hardware tree fetching
   - Time-series data retrieval
   - Sensor updates polling

2. **Equipment Module** (`@switchyard/equipment`)
   - Equipment CRUD operations
   - Threshold management
   - Sensor ID pairing
   - Inventory group linking

3. **Temperature Data Module** (`@switchyard/temperature-data`)
   - Time-series data storage in Supabase
   - Historical data queries
   - Latest reading retrieval
   - Background sync service

4. **Equipment Alerts Module** (`@switchyard/equipment-alerts`)
   - Alert detection and creation
   - Threshold checking
   - Connectivity monitoring
   - Alert resolution tracking

5. **Equipment Notifications Module** (`@switchyard/equipment-notifications`)
   - User-to-alert-type assignments
   - Multi-channel notifications (email/SMS/in-app)
   - Notification delivery service

6. **API Routes**
   - Equipment CRUD: `/admin/equipment`
   - Alerts: `/admin/equipment/alerts`
   - Time-series: `/admin/equipment/:id/time-series`
   - Reports: `/admin/equipment/reports`
   - Notification assignments: `/admin/equipment/notification-assignments`

7. **Background Sync Workflow**
   - Scheduled data sync every 5 minutes
   - Automatic alert detection
   - Notification triggering

### ✅ Frontend Dashboard

1. **Equipment Navigation**
   - Main Equipment menu item
   - Sub-items: Refrigeration, Handhelds, Robots

2. **Refrigeration Dashboard** (`/equipment/refrigeration`)
   - **Equipment Monitoring Tab**:
     - Active alerts section (resolve/acknowledge)
     - Equipment grid with current temp/humidity cards
     - Equipment detail modal with:
       - Temperature & humidity charts (Recharts)
       - Time range selectors (1h, 6h, 24h, 7d, 30d)
       - Alert history
       - Equipment details
   
   - **Notifications Management Tab**:
     - Alert type selection
     - User assignment interface
     - Notification channel selection (email/SMS/in-app)
     - Current assignments display
   
   - **Historical Reporting Tab**:
     - Equipment selector
     - Date range picker
     - Report format selection (PDF/CSV)
     - Report generation and download

3. **React Query Hooks**
   - `useEquipmentList()` - List equipment
   - `useEquipment()` - Get equipment details
   - `useEquipmentAlerts()` - List alerts with auto-refresh
   - `useResolveAlert()` / `useAcknowledgeAlert()` - Alert actions
   - `useEquipmentTimeSeries()` - Historical data
   - `useEquipmentCurrentReadings()` - Latest readings

4. **Components**
   - Equipment cards with status indicators
   - Temperature/humidity charts with dual Y-axes
   - Active alerts display with severity badges
   - Notification assignment UI
   - Report generator form

## Database Schema

- `equipment` - Equipment records (fridges, freezers, etc.)
- `equipment_thresholds` - Temperature/humidity thresholds per equipment
- `temperature_readings` - Time-series sensor data
- `equipment_alerts` - Active and historical alerts
- `alert_notification_assignments` - User alert subscriptions

## Setup Instructions

See [Equipment Monitoring Setup Guide](docs/guides/equipment-monitoring-setup.md) for detailed setup instructions.

### Quick Start

1. **Add Environment Variables**:
   ```env
   SWIFT_SENSORS_API_KEY=your_key
   SWIFT_SENSORS_EMAIL=your_email
   SWIFT_SENSORS_PASSWORD=your_password
   SWIFT_SENSORS_ACCOUNT_ID=.12345.
   ```

2. **Register Modules** in `switchyard.config.ts`:
   ```typescript
   modules: [
     { resolve: "@switchyard/equipment" },
     { resolve: "@switchyard/temperature-data" },
     { resolve: "@switchyard/equipment-alerts" },
     { resolve: "@switchyard/equipment-notifications" },
   ]
   ```

3. **Run Migrations**:
   ```bash
   npm run migration:run
   ```

4. **Create Equipment Records**:
   - Use admin UI or API to create 20 equipment records
   - Pair Swift Sensors IDs after hardware installation

5. **Configure Thresholds**:
   - Set temperature ranges for each equipment unit
   - Configure humidity thresholds if applicable

6. **Set Up Notifications**:
   - Assign users to alert types
   - Configure notification channels

## Features

### Real-Time Monitoring
- Current temperature and humidity displayed on equipment cards
- Auto-refreshing data (every 30 seconds for alerts, 1 minute for readings)
- Status indicators (normal/warning/critical/offline)

### Alert System
- Automatic threshold checking
- Multi-severity alerts (warning/critical)
- Alert resolution tracking
- Connectivity loss detection

### Historical Analysis
- Interactive charts with Recharts
- Multiple time ranges
- Dual Y-axis for temperature and humidity
- Exportable reports (PDF/CSV)

### Notifications
- User-based alert subscriptions
- Multi-channel delivery (email/SMS/in-app)
- Per-equipment or global assignments

## File Structure

```
packages/
├── modules/
│   ├── equipment/              # Equipment management
│   ├── temperature-data/       # Time-series data storage
│   ├── equipment-alerts/       # Alert system
│   ├── equipment-notifications/# Notification assignments
│   └── providers/
│       └── swift-sensors/      # Swift Sensors API client
├── admin/
│   ├── dashboard/
│   │   └── src/
│   │       └── hooks/api/
│   │           └── equipment.tsx
│   └── goods-admin-extensions/
│       └── src/routes/equipment/
│           ├── refrigeration/  # Main dashboard
│           ├── handhelds/      # Placeholder
│           └── robots/         # Placeholder
├── switchyard/
│   └── src/api/admin/equipment/
└── core/
    └── core-flows/src/equipment/  # Background sync workflow
```

## Next Steps When Sensors Arrive

1. Install Swift Sensors hardware (gateways, devices, sensors)
2. Note the sensor IDs from Swift Sensors dashboard
3. Create equipment records in admin UI
4. Pair sensor IDs to equipment (update `swift_sensor_id_temperature` and `swift_sensor_id_humidity`)
5. Configure thresholds for each equipment unit
6. Assign users to receive alerts
7. Verify data flow in dashboard

## Support

For issues or questions:
- Check setup guide: `docs/guides/equipment-monitoring-setup.md`
- Review API docs: `docs/guides/swift-sensors-api.md`
- Check logs for sync errors
- Verify environment variables are set correctly
