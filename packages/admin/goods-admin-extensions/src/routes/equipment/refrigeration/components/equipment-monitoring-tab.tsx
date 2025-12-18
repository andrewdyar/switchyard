import { Heading, Text } from "@switchyard/ui"
import { useEquipmentList } from "@switchyard/dashboard/hooks/api/equipment"
import { ActiveAlertsSection } from "./active-alerts-section"
import { EquipmentGrid } from "./equipment-grid"

export const EquipmentMonitoringTab = () => {
  const { data: refrigerators, isLoading: refrigeratorsLoading } = useEquipmentList({ 
    type: "refrigerator",
    is_active: true 
  })
  
  const { data: freezers, isLoading: freezersLoading } = useEquipmentList({ 
    type: "freezer",
    is_active: true 
  })

  const allEquipment = [
    ...(refrigerators || []),
    ...(freezers || [])
  ]

  const isLoading = refrigeratorsLoading || freezersLoading

  return (
    <div className="flex flex-col gap-6">
      <ActiveAlertsSection />
      
      <div>
        <Heading level="h2" className="mb-4">
          Equipment Overview
        </Heading>
        {isLoading ? (
          <Text className="text-ui-fg-subtle">Loading equipment...</Text>
        ) : (
          <>
            <Text className="text-ui-fg-subtle mb-4">
              {allEquipment.length} units monitored
            </Text>
            <EquipmentGrid equipment={allEquipment} />
          </>
        )}
      </div>
    </div>
  )
}
