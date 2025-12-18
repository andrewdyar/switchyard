import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

export interface Equipment {
  id: string
  name: string
  type: "refrigerator" | "freezer" | "handheld" | "robot"
  inventory_group_id: string | null
  swift_collector_id: number | null
  swift_device_id: number | null
  swift_sensor_id_temperature: number | null
  swift_sensor_id_humidity: number | null
  metadata: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EquipmentAlert {
  id: string
  equipment_id: string
  alert_type: string
  severity: "warning" | "critical"
  status: "active" | "acknowledged" | "resolved"
  current_value: number | null
  threshold_value: number | null
  message: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolved_reason: string | null
  triggered_at: string
  created_at: string
}

export interface TemperatureReading {
  id: string
  equipment_id: string
  sensor_id: number
  measurement_type: "temperature" | "humidity"
  value: number
  unit: string
  threshold_status: number | null
  recorded_at: string
  swift_timestamp: number | null
  created_at: string
}

export const useEquipmentList = (filters?: { type?: string; is_active?: boolean }) => {
  return useQuery({
    queryKey: ["equipment", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.type) params.append("type", filters.type)
      if (filters?.is_active !== undefined) params.append("is_active", String(filters.is_active))
      
      const response = await sdk.client.fetch<{ equipment: Equipment[] }>(`/admin/equipment?${params.toString()}`)
      return response.equipment
    },
  })
}

export const useEquipment = (id: string) => {
  return useQuery({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const response = await sdk.client.fetch<{ equipment: Equipment }>(`/admin/equipment/${id}`)
      return response.equipment
    },
    enabled: !!id,
  })
}

export const useEquipmentAlerts = (filters?: {
  equipment_id?: string
  status?: string
  alert_type?: string
  severity?: string
}) => {
  return useQuery({
    queryKey: ["equipment-alerts", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.equipment_id) params.append("equipment_id", filters.equipment_id)
      if (filters?.status) params.append("status", filters.status)
      if (filters?.alert_type) params.append("alert_type", filters.alert_type)
      if (filters?.severity) params.append("severity", filters.severity)

      const response = await sdk.client.fetch<{ alerts: EquipmentAlert[] }>(`/admin/equipment/alerts?${params.toString()}`)
      return response.alerts
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export const useResolveAlert = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await sdk.client.fetch<{ alert: EquipmentAlert }>(`/admin/equipment/alerts/${id}/resolve`, {
        method: "PATCH",
        body: { reason },
      })
      return response.alert
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-alerts"] })
    },
  })
}

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await sdk.client.fetch<{ alert: EquipmentAlert }>(`/admin/equipment/alerts/${id}/acknowledge`, {
        method: "PATCH",
      })
      return response.alert
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-alerts"] })
    },
  })
}

export const useEquipmentTimeSeries = (
  equipmentId: string,
  startTime: number,
  endTime: number,
  measurementType: "temperature" | "humidity" | "both" = "both"
) => {
  return useQuery({
    queryKey: ["equipment-time-series", equipmentId, startTime, endTime, measurementType],
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: String(startTime),
        endTime: String(endTime),
        measurementType,
      })
      const response = await sdk.client.fetch<{ readings: TemperatureReading[] }>(
        `/admin/equipment/${equipmentId}/time-series?${params.toString()}`
      )
      return response.readings
    },
    enabled: !!equipmentId && !!startTime && !!endTime,
  })
}

export const useEquipmentCurrentReadings = (equipmentId: string) => {
  return useQuery({
    queryKey: ["equipment-current-readings", equipmentId],
    queryFn: async () => {
      // Get latest reading from time series (last 1 hour)
      const endTime = Date.now()
      const startTime = endTime - 60 * 60 * 1000 // 1 hour ago
      const response = await sdk.client.fetch<{ readings: TemperatureReading[] }>(
        `/admin/equipment/${equipmentId}/time-series?startTime=${startTime}&endTime=${endTime}&measurementType=both`
      )
      const allReadings = response.readings
      
      // Get most recent temperature and humidity
      const tempReadings = allReadings.filter((r) => r.measurement_type === "temperature")
      const humidityReadings = allReadings.filter((r) => r.measurement_type === "humidity")
      
      return {
        temperature: tempReadings.length > 0 ? tempReadings[tempReadings.length - 1] : null,
        humidity: humidityReadings.length > 0 ? humidityReadings[humidityReadings.length - 1] : null,
      }
    },
    enabled: !!equipmentId,
    refetchInterval: 60000, // Refresh every minute
  })
}
