/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text, Tabs } from "@switchyard/ui"
import { useState } from "react"
import { EquipmentMonitoringTab } from "./components/equipment-monitoring-tab"
import { NotificationsManagementTab } from "./components/notifications-management-tab"
import { HistoricalReportingTab } from "./components/historical-reporting-tab"

const RefrigerationPage = () => {
  const [activeTab, setActiveTab] = useState("monitoring")

  return (
    <Container className="divide-y p-0">
      <div className="px-6 pt-4">
        <Heading level="h1" className="mb-4">
          Refrigeration Monitoring
        </Heading>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="monitoring">Equipment Monitoring</Tabs.Trigger>
            <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
            <Tabs.Trigger value="reports">Historical Reports</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </div>

      <div className="px-6 py-6">
        {activeTab === "monitoring" && <EquipmentMonitoringTab />}
        {activeTab === "notifications" && <NotificationsManagementTab />}
        {activeTab === "reports" && <HistoricalReportingTab />}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Refrigeration",
  link: {
    label: "Refrigeration",
    icon: null,
  },
})

export default RefrigerationPage
