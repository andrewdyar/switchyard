import { useState } from "react"
import { Heading, Text, Button, Badge, Select } from "@switchyard/ui"

const ALERT_TYPES = [
  { value: "temperature_high", label: "Temperature High" },
  { value: "temperature_low", label: "Temperature Low" },
  { value: "humidity_high", label: "Humidity High" },
  { value: "humidity_low", label: "Humidity Low" },
  { value: "connectivity_loss", label: "Connectivity Loss" },
  { value: "battery_low", label: "Battery Low" },
  { value: "sensor_offline", label: "Sensor Offline" },
]

const NOTIFICATION_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "in_app", label: "In-App" },
]

// Mock users - replace with actual users API when available
const MOCK_USERS = [
  { id: "1", email: "admin@goods.com", first_name: "Admin", last_name: "User" },
  { id: "2", email: "manager@goods.com", first_name: "Store", last_name: "Manager" },
]

export const NotificationsManagementTab = () => {
  const [selectedAlertType, setSelectedAlertType] = useState<string>("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const users = MOCK_USERS
  const isLoading = false

  const handleSaveAssignment = async () => {
    // TODO: Implement save logic using notification assignments API
    console.log("Save assignment", {
      alertType: selectedAlertType,
      users: selectedUsers,
      channels: selectedChannels,
    })
    alert("Assignment saved successfully!")
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading level="h2" className="mb-2">
          Notification Assignments
        </Heading>
        <Text className="text-ui-fg-subtle">
          Assign users to receive alerts for specific alert types. Users will only receive
          notifications for alert types they are assigned to.
        </Text>
      </div>

      <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6 space-y-4">
        <div>
          <Text weight="plus" className="mb-2">
            Alert Type
          </Text>
          <select
            value={selectedAlertType}
            onChange={(e) => setSelectedAlertType(e.target.value)}
            className="w-full p-2 border border-ui-border-base rounded-lg bg-ui-bg-base"
          >
            <option value="">Select alert type</option>
            {ALERT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Text weight="plus" className="mb-2">
            Assign Users
          </Text>
          {isLoading ? (
            <Text className="text-ui-fg-subtle">Loading users...</Text>
          ) : (
            <div className="space-y-2">
              {users?.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 p-2 hover:bg-ui-bg-base rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id])
                      } else {
                        setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                      }
                    }}
                    className="rounded"
                  />
                  <Text>
                    {user.first_name} {user.last_name} ({user.email})
                  </Text>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <Text weight="plus" className="mb-2">
            Notification Channels
          </Text>
          <div className="flex gap-4">
            {NOTIFICATION_CHANNELS.map((channel) => (
              <label
                key={channel.value}
                className="flex items-center gap-2 p-2 hover:bg-ui-bg-base rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channel.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannels([...selectedChannels, channel.value])
                    } else {
                      setSelectedChannels(selectedChannels.filter((c) => c !== channel.value))
                    }
                  }}
                  className="rounded"
                />
                <Text>{channel.label}</Text>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSaveAssignment}
          disabled={!selectedAlertType || selectedUsers.length === 0 || selectedChannels.length === 0}
        >
          Save Assignment
        </Button>
      </div>

      <div>
        <Heading level="h3" className="mb-4">
          Current Assignments
        </Heading>
        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
          <Text className="text-ui-fg-subtle">
            Current notification assignments will be displayed here.
            Configure assignments above to get started.
          </Text>
        </div>
      </div>
    </div>
  )
}
