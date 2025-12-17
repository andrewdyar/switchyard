import { useState } from "react"
import { Container, Heading, Text, Button, Select, Input, Badge } from "@switchyard/ui"
import { useEquipmentList } from "../../../../../../dashboard/src/hooks/api/equipment"
import { format } from "date-fns"

export const HistoricalReportingTab = () => {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("")
  const [startDate, setStartDate] = useState<string>(
    format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  )
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [reportType, setReportType] = useState<"csv" | "pdf">("pdf")

  const { equipment: fridges, isLoading: fridgesLoading } = useEquipmentList({
    type: "refrigerator",
    is_active: true,
  })

  const { equipment: freezers, isLoading: freezersLoading } = useEquipmentList({
    type: "freezer",
    is_active: true,
  })

  const allEquipment = [...(fridges || []), ...(freezers || [])]
  const isLoading = fridgesLoading || freezersLoading

  const handleGenerateReport = async () => {
    if (!selectedEquipment) {
      alert("Please select equipment")
      return
    }

    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 // End of day

    try {
      const params = new URLSearchParams({
        equipmentId: selectedEquipment,
        startTime: String(start),
        endTime: String(end),
        format: reportType,
      })

      const response = await fetch(`/admin/equipment/reports?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `equipment-report-${selectedEquipment}-${startDate}-${endDate}.${reportType}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Failed to generate report")
      }
    } catch (error) {
      console.error("Failed to generate report", error)
      alert("Failed to generate report")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading level="h2" className="mb-2">
          Generate Historical Report
        </Heading>
        <Text className="text-ui-fg-subtle">
          Create reports for individual equipment units covering specific time periods.
          Reports include temperature and humidity data, alerts, and threshold breaches.
        </Text>
      </div>

      <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6 space-y-4">
        <div>
          <Text weight="plus" className="mb-2">
            Equipment
          </Text>
          {isLoading ? (
            <Text className="text-ui-fg-subtle">Loading equipment...</Text>
          ) : (
            <Select
              value={selectedEquipment}
              onValueChange={setSelectedEquipment}
              placeholder="Select equipment"
            >
              {allEquipment.map((eq) => (
                <Select.Item key={eq.id} value={eq.id}>
                  {eq.name}
                </Select.Item>
              ))}
            </Select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Text weight="plus" className="mb-2">
              Start Date
            </Text>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Text weight="plus" className="mb-2">
              End Date
            </Text>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Text weight="plus" className="mb-2">
            Report Format
          </Text>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="reportType"
                value="pdf"
                checked={reportType === "pdf"}
                onChange={() => setReportType("pdf")}
              />
              <Text>PDF</Text>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="reportType"
                value="csv"
                checked={reportType === "csv"}
                onChange={() => setReportType("csv")}
              />
              <Text>CSV</Text>
            </label>
          </div>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={!selectedEquipment || !startDate || !endDate}
        >
          Generate Report
        </Button>
      </div>

      <div>
        <Heading level="h3" className="mb-4">
          Report Options
        </Heading>
        <div className="space-y-2 text-sm text-ui-fg-subtle">
          <Text>• PDF reports include charts, summary statistics, and alert timeline</Text>
          <Text>• CSV reports include raw temperature and humidity data for analysis</Text>
          <Text>• Reports cover the selected date range (inclusive)</Text>
          <Text>• Data is pulled from Supabase historical storage</Text>
        </div>
      </div>
    </div>
  )
}
