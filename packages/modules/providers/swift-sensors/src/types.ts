/**
 * Swift Sensors API Types
 */

export interface SwiftSensorsAuthResponse {
  access_token: string
  expires_in: number
  token_type: string
  refresh_token: string
  account_id: string
}

export interface SwiftSensorsTokenInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number
  accountId: string
}

export interface SwiftSensorsSensor {
  id: number
  profileName: string
  value: number
  time: number
  thresholdStatus: number
  unitId: number
  precision: number
}

export interface SwiftSensorsDevice {
  id: number
  name: string
  sensors: SwiftSensorsSensor[]
}

export interface SwiftSensorsCollector {
  id: number
  name: string
  devices: SwiftSensorsDevice[]
}

export interface SwiftSensorsHardwareTree {
  serverTime: number
  lastTreeChangeTime: number
  account: {
    id: string
    name: string
    collectors: SwiftSensorsCollector[]
  }
}

export interface SwiftSensorsTimeSeriesRequest {
  startTime: number
  endTime: number
  ids: number[]
  influxFn?: "MEAN" | null
  groupByMinutes?: number
  type?: "samples" | "notes" | null
  timeUnitDesignation?: "seconds" | "milliseconds"
}

export interface SwiftSensorsTimeSeriesDataPoint {
  time: number
  value: number
}

export interface SwiftSensorsTimeSeriesResponse {
  startTime: number
  endTime: number
  timeSeriesData: Array<{
    id: number
    samples: SwiftSensorsTimeSeriesDataPoint[]
    notes?: Array<[number, number, string, number, number]>
  }>
}

export interface SwiftSensorsSensorUpdate {
  time: number
  value: number
  thresholdStatus: number
  lastNormalTime: number
}

export interface SwiftSensorsSensorUpdates {
  serverTime: number
  sensorData: Record<string, [number, number, number, number]> // sensorId: [time, value, thresholdStatus, lastNormalTime]
}

export interface SwiftSensorsSensorDetails {
  id: number
  accountId: string
  name: string
  description: string
  propertyTypeId: number
  displayUnitTypeId: number
  value: number
  time: number
  thresholdStatus: number
  thresholdId: number
  precision: number
  isHidden: boolean
  sensorProfile: {
    id: number
    name: string
    description: string
  }
}

export interface SwiftSensorsOptions {
  apiKey: string
  email: string
  password: string
  baseUrl?: string
}

