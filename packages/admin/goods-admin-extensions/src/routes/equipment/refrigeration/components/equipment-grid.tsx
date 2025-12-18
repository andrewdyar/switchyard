import { useState } from "react"
import { Heading, Text, Badge } from "@switchyard/ui"
import { Equipment, useEquipmentCurrentReadings } from "@switchyard/dashboard/hooks/api/equipment"
import { EquipmentDetailModal } from "./equipment-detail-modal"

interface EquipmentGridProps {
  equipment: Equipment[]
}

export const EquipmentGrid = ({ equipment }: EquipmentGridProps) => {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <Text className="text-ui-fg-subtle">No equipment configured yet</Text>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {equipment.map((eq) => (
          <EquipmentCard
            key={eq.id}
            equipment={eq}
            onClick={() => setSelectedEquipment(eq)}
          />
        ))}
      </div>

      {selectedEquipment && (
        <EquipmentDetailModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
        />
      )}
    </>
  )
}

interface EquipmentCardProps {
  equipment: Equipment
  onClick: () => void
}

const EquipmentCard = ({ equipment, onClick }: EquipmentCardProps) => {
  const { data, isLoading } = useEquipmentCurrentReadings(equipment.id)
  const temperature = data?.temperature
  const humidity = data?.humidity

  const getStatusColor = () => {
    if (!temperature) return "grey"
    const status = temperature.threshold_status
    if (status === 1) return "green"
    if (status === 2 || status === 3) return "orange"
    return "red"
  }

  const getStatusText = () => {
    if (!temperature) return "No Data"
    const status = temperature.threshold_status
    if (status === 1) return "Normal"
    if (status === 2) return "Low Warning"
    if (status === 3) return "High Warning"
    if (status === 4) return "Low Critical"
    if (status === 5) return "High Critical"
    return "Unknown"
  }

  return (
    <div
      className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <Heading level="h3" className="text-lg">
          {equipment.name}
        </Heading>
        <Badge color={getStatusColor()}>{getStatusText()}</Badge>
      </div>

      <div className="space-y-2">
        <div>
          <Text size="small" className="text-ui-fg-subtle">
            Temperature
          </Text>
          {isLoading ? (
            <Text>Loading...</Text>
          ) : temperature ? (
            <Text className="text-2xl font-semibold">
              {temperature.value.toFixed(1)}{temperature.unit}
            </Text>
          ) : (
            <Text className="text-ui-fg-subtle">No data</Text>
          )}
        </div>

        {equipment.swift_sensor_id_humidity && (
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Humidity
            </Text>
            {humidity ? (
              <Text className="text-xl">
                {humidity.value.toFixed(1)}{humidity.unit}
              </Text>
            ) : (
              <Text className="text-ui-fg-subtle">No data</Text>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-ui-border-base">
          <Text size="small" className="text-ui-fg-muted">
            Type: {equipment.type}
          </Text>
          {temperature && (
            <Text size="small" className="text-ui-fg-muted">
              Last updated: {new Date(temperature.recorded_at).toLocaleTimeString()}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}
