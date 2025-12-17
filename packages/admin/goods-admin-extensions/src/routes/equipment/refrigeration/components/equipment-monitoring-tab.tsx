import { useState } from "react"
import { Container, Heading, Text, Badge, Button } from "@switchyard/ui"
import { useEquipmentList, useEquipmentAlerts, useResolveAlert, useAcknowledgeAlert } from "../../../../../../dashboard/src/hooks/api/equipment"
import { ActiveAlertsSection } from "./active-alerts-section"
import { EquipmentGrid } from "./equipment-grid"

export const EquipmentMonitoringTab = () => {
  const { equipment, isLoading } = useEquipmentList({ 
    type: "refrigerator",
    is_active: true 
  })
  
  const freezers = useEquipmentList({ 
    type: "freezer",
    is_active: true 
  })

  const allEquipment = [
    ...(equipment || []),
    ...(freezers.equipment || [])
  ]

  return (
    <div className="flex flex-col gap-6">
      <ActiveAlertsSection />
      
      <div>
        <Heading level="h2" className="mb-4">
          Equipment Overview
        </Heading>
        <Text className="text-ui-fg-subtle mb-4">
          {allEquipment.length} units monitored
        </Text>
        <EquipmentGrid equipment={allEquipment} />
      </div>
    </div>
  )
}
