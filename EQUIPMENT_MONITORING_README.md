# Equipment Monitoring System

A comprehensive temperature and humidity monitoring system for refrigeration equipment, integrated with Swift Sensors.

## Overview

This system provides:
- Real-time temperature and humidity monitoring
- Custom alert thresholds with warning and critical levels
- Multi-channel notifications (email, SMS, in-app)
- Historical data storage and reporting
- Dashboard UI for monitoring and management

## Features

### Backend Modules
- **Equipment Module** - Manage equipment units and thresholds
- **Temperature Data Module** - Store and query time-series data
- **Equipment Alerts Module** - Alert detection and tracking
- **Equipment Notifications Module** - User notification assignments
- **Swift Sensors Provider** - API client for Swift Sensors integration

### API Endpoints
- Equipment CRUD operations
- Alert management (list, resolve, acknowledge)
- Time series data queries
- Notification assignment management
- Report generation (CSV/JSON)

### Admin Dashboard
- Equipment monitoring tab with real-time readings
- Active alerts section with resolve/acknowledge actions
- Equipment detail modal with historical charts
- Notifications management tab
- Historical reporting tab with date range selection

## Database Schema

```
equipment
├── id
├── name
├── type (refrigerator, freezer, handheld, robot)
├── inventory_group_id
├── swift_sensor_id_temperature
├── swift_sensor_id_humidity
└── is_active

equipment_thresholds
├── equipment_id
├── measurement_type
├── low_critical
├── low_warning
├── high_warning
└── high_critical

temperature_readings
├── equipment_id
├── sensor_id
├── measurement_type
├── value
├── unit
├── threshold_status
└── recorded_at

equipment_alerts
├── equipment_id
├── alert_type
├── severity
├── status
├── current_value
├── threshold_value
├── triggered_at
└── resolved_at

alert_notification_assignments
├── user_id
├── alert_type
├── notification_channels
├── equipment_id (optional)
└── is_active
```

## Quick Start

1. Add environment variables:
```bash
SWIFT_SENSORS_API_KEY=xxx
SWIFT_SENSORS_EMAIL=xxx
SWIFT_SENSORS_PASSWORD=xxx
SWIFT_SENSORS_ACCOUNT_ID=xxx
```

2. Register modules in `medusa-config.js`

3. Run migrations:
```bash
npx medusa migrations run
```

4. Access the Equipment section in the admin dashboard

## File Structure

```
switchyard/packages/
├── modules/
│   ├── equipment/
│   ├── temperature-data/
│   ├── equipment-alerts/
│   ├── equipment-notifications/
│   └── providers/swift-sensors/
├── admin/
│   ├── dashboard/src/hooks/api/equipment.tsx
│   └── goods-admin-extensions/src/routes/equipment/
└── switchyard/src/api/admin/equipment/
```

## Next Steps

When sensors arrive:
1. Install sensors per Swift Sensors documentation
2. Note sensor IDs from Swift Sensors dashboard
3. Update equipment with sensor IDs via API
4. Configure thresholds per unit
5. Set up notification assignments
6. Begin monitoring!

See `docs/guides/equipment-monitoring-setup.md` for detailed setup instructions.
