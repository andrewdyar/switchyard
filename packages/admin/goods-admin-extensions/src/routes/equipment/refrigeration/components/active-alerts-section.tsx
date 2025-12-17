import { useState } from "react"
import { Container, Heading, Text, Badge, Button, Alert } from "@switchyard/ui"
import { 
  useEquipmentAlerts, 
  useResolveAlert, 
  useAcknowledgeAlert,
  EquipmentAlert 
} from "../../../../../../dashboard/src/hooks/api/equipment"
import { useEquipment } from "../../../../../../dashboard/src/hooks/api/equipment"

export const ActiveAlertsSection = () => {
  const { alerts, isLoading } = useEquipmentAlerts({ status: "active" })
  const resolveAlert = useResolveAlert()
  const acknowledgeAlert = useAcknowledgeAlert()

  const criticalAlerts = alerts?.filter(a => a.severity === "critical") || []
  const warningAlerts = alerts?.filter(a => a.severity === "warning") || []

  const handleResolve = async (alert: EquipmentAlert) => {
    await resolveAlert.mutateAsync({ id: alert.id, reason: "Resolved by user" })
  }

  const handleAcknowledge = async (alert: EquipmentAlert) => {
    await acknowledgeAlert.mutateAsync(alert.id)
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2" className="mb-1">Active Alerts</Heading>
            <Text className="text-ui-fg-subtle">No active alerts</Text>
          </div>
          <Badge color="green">All Clear</Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Heading level="h2" className="mb-1">Active Alerts</Heading>
          <Text className="text-ui-fg-subtle">
            {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
          </Text>
        </div>
        <div className="flex gap-2">
          {criticalAlerts.length > 0 && (
            <Badge color="red">{criticalAlerts.length} Critical</Badge>
          )}
          {warningAlerts.length > 0 && (
            <Badge color="orange">{warningAlerts.length} Warning</Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.severity === "critical" ? "error" : "warning"}
            className="flex items-center justify-between p-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Text weight="plus">{alert.alert_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</Text>
                <Badge color={alert.severity === "critical" ? "red" : "orange"}>
                  {alert.severity}
                </Badge>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {alert.message || `Equipment ${alert.equipment_id} - ${alert.current_value !== null ? `Current: ${alert.current_value}` : ""}`}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Triggered: {new Date(alert.triggered_at).toLocaleString()}
              </Text>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleAcknowledge(alert)}
                disabled={acknowledgeAlert.isPending}
              >
                Acknowledge
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={() => handleResolve(alert)}
                disabled={resolveAlert.isPending}
              >
                Resolve
              </Button>
            </div>
          </Alert>
        ))}
        {alerts.length > 5 && (
          <Text size="small" className="text-ui-fg-subtle text-center">
            ...and {alerts.length - 5} more alerts
          </Text>
        )}
      </div>
    </div>
  )
}
