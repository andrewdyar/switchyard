# Swift Sensors API Documentation

> **Note**: This documentation has been reformatted from the original Swift Sensors API documentation for easier integration into Switchyard's admin dashboard.

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Core Concepts](#core-concepts)
4. [Key Endpoints for Temperature Monitoring](#key-endpoints-for-temperature-monitoring)
5. [Time Series Data](#time-series-data)
6. [Integration Guide](#integration-guide)

---

## Introduction

The Swift Sensors API provides RESTful endpoints for integrating temperature monitoring and other sensor data into custom applications. This document focuses on the endpoints and concepts most relevant to temperature logging and monitoring in the Switchyard admin dashboard.

**Base URL**: `https://api.swiftsensors.net`

**API Version**: `v1` (latest) and `v2` (for newer endpoints)

### Terminology

| API Term | Console Term | Description |
|----------|--------------|-------------|
| Collector | Gateway | Grid-powered hardware that collects data from nearby Devices |
| Device | Sensor | Battery-powered hardware with one or more Sensors |
| Sensor | Measurement | Electrical instrument that measures a physical property (e.g., temperature) |

---

## Authentication

### Requirements

Every API request requires two headers:

1. **API Key**: `X-API-Key: YOUR_API_KEY`
2. **Authorization Token**: `Authorization: Bearer YOUR_ACCESS_TOKEN`

> **Important**: Contact Swift Sensors Support (support@swiftsensors.com) to obtain an API key if your account doesn't have one.

### Sign In

Get an access token by signing in with email/password:

**Request:**
```
POST https://api.swiftsensors.net/api/client/v1/sign-in
Content-Type: application/json
X-API-Key: YOUR_API_KEY

{
  "email": "user@example.com",
  "password": "password123",
  "language": "en"  // optional
}
```

**Response:**
```json
{
  "access_token": "ABC...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "refresh_token": "XYZ...",
  "account_id": ".12345."
}
```

### Refresh Token

Refresh an expired access token:

**Request:**
```
POST https://api.swiftsensors.net/api/token/v2/refresh
Content-Type: text/plain
X-API-Key: YOUR_API_KEY

YOUR_REFRESH_TOKEN
```

**Response:**
```json
{
  "access_token": "NEW_TOKEN...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "refresh_token": "NEW_REFRESH_TOKEN..."
}
```

---

## Core Concepts

### Hardware Hierarchy

```
Account
├── Hardware Groups (optional)
│   ├── Collectors (Gateways)
│   │   ├── Devices (Sensors)
│   │   │   └── Sensors (Measurements)
│   │   └── Devices...
│   └── Hardware Groups... (nested)
└── Collectors... (at root level)
```

### Sensor Tree

Organizes Sensors (Measurements) logically, independent of hardware:

```
Account
├── Sensor Groups (optional)
│   ├── Sensors
│   └── Sensor Groups... (nested)
└── Sensors... (at root level)
```

---

## Key Endpoints for Temperature Monitoring

### Get Hardware Tree

Retrieves the complete hardware hierarchy with current sensor values:

**Request:**
```
GET https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/treemap
Authorization: Bearer {token}
X-API-Key: {api_key}
```

**Response Structure:**
```json
{
  "serverTime": 1492800929413,
  "lastTreeChangeTime": 1492800922,
  "account": {
    "id": ".1.",
    "name": "Warehouse",
    "collectors": [
      {
        "id": 1,
        "name": "Cold Storage Gateway",
        "devices": [
          {
            "id": 1,
            "name": "Freezer 1 Sensor",
            "sensors": [
              {
                "id": 1,
                "profileName": "Temperature",
                "value": 72.5,
                "time": 1492800921,
                "thresholdStatus": 1,  // 1=normal, 2=low_warning, etc.
                "unitId": 1,  // Fahrenheit
                "precision": 1
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Get Sensor Details

Retrieves metadata for a specific sensor:

**Request:**
```
GET https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/{sensorId}
Authorization: Bearer {token}
X-API-Key: {api_key}
```

**Response:**
```json
{
  "id": 444,
  "accountId": ".1.",
  "name": "Freezer 1 Temperature",
  "description": "",
  "propertyTypeId": 1,  // 1 = Temperature
  "displayUnitTypeId": 1,  // 1 = Fahrenheit
  "value": 72.125,
  "time": 149392492743,
  "thresholdStatus": 1,
  "thresholdId": 1,
  "precision": 1,
  "isHidden": false,
  "sensorProfile": {
    "id": 1,
    "name": "Temperature",
    "description": ""
  }
}
```

### Get Current Sensor Values (Updates)

Get updated sensor values without fetching the entire tree:

**Request:**
```
GET https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/treeupdate
Authorization: Bearer {token}
X-API-Key: {api_key}
```

**Response:**
```json
{
  "serverTime": 1445961284000,
  "sensorData": {
    "1000": [1445961284, 72.5, 1, 1445961284],  // [time, value, thresholdStatus, lastNormalTime]
    "1001": [1445961284, 35.2, 2, 1445961284]
  }
}
```

---

## Time Series Data

### Get Sensor Time Series

Retrieves historical temperature data for charting:

**Request:**
```
POST https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/time-series/sensor
Authorization: Bearer {token}
X-API-Key: {api_key}
Content-Type: application/json

{
  "startTime": 1718653104734,
  "endTime": 1718655739846,
  "ids": [4, 6],
  "influxFn": "MEAN",  // null for raw data, "MEAN" for averaged
  "groupByMinutes": 5,  // required if influxFn is "MEAN"
  "type": "samples",  // "samples", "notes", or null for both
  "timeUnitDesignation": "milliseconds"  // "seconds" or "milliseconds"
}
```

**Parameters:**
- `startTime`: Start timestamp (Unix epoch in seconds or milliseconds)
- `endTime`: End timestamp
- `ids`: Array of sensor IDs to query
- `influxFn`: `null` for raw data, `"MEAN"` for averaged data
- `groupByMinutes`: Minutes per data point when using `"MEAN"` (e.g., 60 for hourly averages)
- `type`: `"samples"`, `"notes"`, or `null` (both)
- `timeUnitDesignation`: `"seconds"` (default) or `"milliseconds"`

**Response:**
```json
{
  "startTime": 1.718653104734E12,
  "endTime": 1.718655739846E12,
  "timeSeriesData": [
    {
      "id": 4,
      "samples": [
        [1.718653104734E12, 73.23],  // [time, value]
        [1.718654408236E12, 83.0],
        [1.718655738033E12, 333.1],
        [1.718655739846E12, 71.00]
      ],
      "notes": [
        [1.718654408236E12, 83.0, "Door left open", 123, 1.718655787677E12]  // [time, value, noteText, userId, editTime]
      ]
    }
  ]
}
```

### Threshold Status Values

Temperature threshold status codes:

| Code | Status | Color | Description |
|------|--------|-------|-------------|
| 1 | NORMAL | Green | Value is within normal operating range |
| 2 | LOW_WARNING | Yellow | Value is at or below Low Warning boundary |
| 3 | HIGH_WARNING | Yellow | Value is at or above High Warning boundary |
| 4 | LOW_CRITICAL | Red | Value is at or below Low Critical boundary |
| 5 | HIGH_CRITICAL | Red | Value is at or above High Critical boundary |

---

## Property Types

From the `/statictypes` endpoint, temperature-related properties:

```json
{
  "properties": [
    { "id": 1, "name": "Temperature", "storedTypeId": 2 }
  ],
  "units": [
    { "id": 1, "name": "Fahrenheit", "propertyId": 1, "abbrev": "°F", "defaultPrecision": 1 },
    { "id": 2, "name": "Celsius", "propertyId": 1, "abbrev": "°C", "defaultPrecision": 1 },
    { "id": 3, "name": "Kelvin", "propertyId": 1, "abbrev": "°K", "defaultPrecision": 1 }
  ]
}
```

---

## Integration Guide

### Recommended Integration Approach

1. **Authentication Service**
   - Store API key in environment variables
   - Implement token refresh logic
   - Cache tokens in memory/session

2. **Data Fetching**
   - Use React Query for time series data
   - Implement polling for real-time updates (treeupdate endpoint)
   - Cache hardware tree structure

3. **UI Components**
   - Sensor list/detail pages
   - Temperature charts (using time series endpoint)
   - Threshold status indicators
   - Real-time value displays

4. **Location Mapping**
   - Link Swift Sensors Devices/Collectors to Inventory Groups
   - Store mapping in `inventory_groups.metadata` or separate mapping table
   - Allow admin users to assign sensors to warehouse locations

### Example API Client Structure

```typescript
// hooks/api/swift-sensors.ts
export const useSwiftSensorsAuth = () => {
  // Sign in, refresh token, etc.
}

export const useHardwareTree = (accountId: string) => {
  // Fetch hardware tree with current sensor values
}

export const useSensorTimeSeries = (
  accountId: string,
  sensorIds: number[],
  startTime: number,
  endTime: number,
  options?: { groupByMinutes?: number }
) => {
  // Fetch historical temperature data
}

export const useSensorUpdates = (accountId: string) => {
  // Poll for real-time sensor value updates
}
```

### Linking to Inventory Locations

**Option 1: Store in Metadata**
```typescript
// Link sensor to inventory location
await updateInventoryGroup(locationId, {
  metadata: {
    swiftSensorDeviceId: 123,
    swiftSensorIds: [444, 445]  // Multiple sensors per location
  }
})
```

**Option 2: Separate Mapping Table**
```sql
CREATE TABLE swift_sensor_location_mapping (
  id UUID PRIMARY KEY,
  inventory_group_id UUID REFERENCES inventory_groups(id),
  swift_collector_id INTEGER,
  swift_device_id INTEGER,
  swift_sensor_id INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Error Codes

Common error codes relevant to integration:

| Code | Meaning |
|------|---------|
| 1123 | Email/password invalid |
| 9997 | API key mismatch |
| 9998 | API quota exceeded |
| 9999 | Invalid API key |
| 403 | Token expired or invalid |

---

## Next Steps

1. Obtain API key from Swift Sensors Support
2. Set up authentication flow
3. Create admin dashboard pages for:
   - Sensor list/management
   - Temperature monitoring dashboard
   - Historical charts
   - Alert/notification management
4. Link sensors to inventory locations
5. Implement real-time updates

