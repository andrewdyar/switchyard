/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text } from "@switchyard/ui"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { EquipmentMonitoringTab } from "./components/equipment-monitoring-tab"
import { NotificationsManagementTab } from "./components/notifications-management-tab"
import { HistoricalReportingTab } from "./components/historical-reporting-tab"

const RefrigerationPage = () => {
  const location = useLocation()
  const activeTab = location.pathname.includes("/notifications")
    ? "notifications"
    : location.pathname.includes("/reports")
    ? "reports"
    : "monitoring"

  const tabs = [
    { label: "Equipment Monitoring", path: "/equipment/refrigeration", key: "monitoring" },
    { label: "Notifications", path: "/equipment/refrigeration/notifications", key: "notifications" },
    { label: "Historical Reports", path: "/equipment/refrigeration/reports", key: "reports" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 pt-4">
        <Heading level="h1" className="mb-4">
          Refrigeration Monitoring
        </Heading>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-ui-border-base -mx-6 px-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                  isActive
                    ? "border-ui-fg-base text-ui-fg-base"
                    : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                <Text size="small" weight={isActive ? "plus" : "regular"}>
                  {tab.label}
                </Text>
              </Link>
            )
          })}
        </div>
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
})

export default RefrigerationPage
