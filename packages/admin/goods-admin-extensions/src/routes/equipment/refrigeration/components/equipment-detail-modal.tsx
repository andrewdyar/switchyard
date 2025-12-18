import { useState } from "react"
import { Heading, Text, Button, Badge, Drawer } from "@switchyard/ui"
import { Equipment, useEquipmentTimeSeries, useEquipmentAlerts } from "@switchyard/dashboard/hooks/api/equipment"
import { TemperatureChart } from "./temperature-chart"

interface EquipmentDetailModalProps {
  equipment: Equipment
  onClose: () => void
}

export const EquipmentDetailModal = ({ equipment, onClose }: EquipmentDetailModalProps) => {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d" | "30d">("24h")
  const [activeTab, setActiveTab] = useState("overview")

  const now = Date.now()
  const timeRanges = {
    "1h": now - 60 * 60 * 1000,
    "6h": now - 6 * 60 * 60 * 1000,
    "24h": now - 24 * 60 * 60 * 1000,
    "7d": now - 7 * 24 * 60 * 60 * 1000,
    "30d": now - 30 * 24 * 60 * 60 * 1000,
  }

  const { data: readings, isLoading } = useEquipmentTimeSeries(
    equipment.id,
    timeRanges[timeRange],
    now,
    "both"
  )

  const { data: alerts } = useEquipmentAlerts({ 
    equipment_id: equipment.id,
    status: "active"
  })

  const temperatureReadings = readings?.filter(r => r.measurement_type === "temperature") || []
  const humidityReadings = readings?.filter(r => r.measurement_type === "humidity") || []

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content className="max-w-4xl">
        <Drawer.Header>
          <Drawer.Title>{equipment.name}</Drawer.Title>
          <Drawer.Description>
            Equipment ID: {equipment.id}
          </Drawer.Description>
        </Drawer.Header>

        <Drawer.Body className="overflow-y-auto">
          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-ui-border-base mb-6">
            {[
              { key: "overview", label: "Overview" },
              { key: "alerts", label: "Alerts" },
              { key: "details", label: "Details" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-ui-fg-base text-ui-fg-base"
                    : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                <Text size="small" weight={activeTab === tab.key ? "plus" : "regular"}>
                  {tab.label}
                </Text>
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Heading level="h3">Temperature & Humidity History</Heading>
                  <div className="flex gap-2">
                    {(["1h", "6h", "24h", "7d", "30d"] as const).map((range) => (
                      <Button
                        key={range}
                        variant={timeRange === range ? "primary" : "secondary"}
                        size="small"
                        onClick={() => setTimeRange(range)}
                      >
                        {range}
                      </Button>
                    ))}
                  </div>
                </div>
                <TemperatureChart
                  temperatureReadings={temperatureReadings}
                  humidityReadings={humidityReadings}
                  isLoading={isLoading}
                />
              </div>

              {alerts && alerts.length > 0 && (
                <div>
                  <Heading level="h3" className="mb-4">Active Alerts</Heading>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${
                          alert.severity === "critical"
                            ? "bg-red-50 border-red-200"
                            : "bg-orange-50 border-orange-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <Text weight="plus">
                              {alert.alert_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </Text>
                            <Text size="small" className="text-ui-fg-subtle">
                              {alert.message}
                            </Text>
                          </div>
                          <Badge color={alert.severity === "critical" ? "red" : "orange"}>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "alerts" && (
            <div>
              <Heading level="h3" className="mb-4">Alert History</Heading>
              <Text className="text-ui-fg-subtle">
                Alert history will be displayed here
              </Text>
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <Text weight="plus" className="mb-2">Equipment Information</Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <Text className="text-ui-fg-subtle">Type:</Text>
                    <Text>{equipment.type}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text className="text-ui-fg-subtle">Status:</Text>
                    <Badge color={equipment.is_active ? "green" : "grey"}>
                      {equipment.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {equipment.inventory_group_id && (
                    <div className="flex justify-between">
                      <Text className="text-ui-fg-subtle">Inventory Group:</Text>
                      <Text>{equipment.inventory_group_id}</Text>
                    </div>
                  )}
                  {equipment.swift_sensor_id_temperature && (
                    <div className="flex justify-between">
                      <Text className="text-ui-fg-subtle">Temperature Sensor ID:</Text>
                      <Text>{equipment.swift_sensor_id_temperature}</Text>
                    </div>
                  )}
                  {equipment.swift_sensor_id_humidity && (
                    <div className="flex justify-between">
                      <Text className="text-ui-fg-subtle">Humidity Sensor ID:</Text>
                      <Text>{equipment.swift_sensor_id_humidity}</Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
