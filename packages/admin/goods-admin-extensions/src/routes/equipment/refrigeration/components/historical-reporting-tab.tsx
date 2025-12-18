import { useState } from "react"
import { Heading, Text, Button, Input } from "@switchyard/ui"
import { useEquipmentList } from "@switchyard/dashboard/hooks/api/equipment"

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0]
}

export const HistoricalReportingTab = () => {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("")
  const [startDate, setStartDate] = useState<string>(
    formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  )
  const [endDate, setEndDate] = useState<string>(formatDate(new Date()))
  const [reportType, setReportType] = useState<"csv" | "pdf">("csv")
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: fridges, isLoading: fridgesLoading } = useEquipmentList({
    type: "refrigerator",
    is_active: true,
  })

  const { data: freezers, isLoading: freezersLoading } = useEquipmentList({
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

    setIsGenerating(true)

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
        if (reportType === "csv") {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `equipment-report-${selectedEquipment}-${startDate}-${endDate}.csv`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          // For PDF/JSON, show in new tab or download
          const data = await response.json()
          console.log("Report data:", data)
          alert("PDF report generated - check console for data")
        }
      } else {
        alert("Failed to generate report")
      }
    } catch (error) {
      console.error("Failed to generate report", error)
      alert("Failed to generate report")
    } finally {
      setIsGenerating(false)
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
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full p-2 border border-ui-border-base rounded-lg bg-ui-bg-base"
            >
              <option value="">Select equipment</option>
              {allEquipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.type})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Text weight="plus" className="mb-2">
              Start Date
            </Text>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-ui-border-base rounded-lg bg-ui-bg-base"
            />
          </div>
          <div>
            <Text weight="plus" className="mb-2">
              End Date
            </Text>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-ui-border-base rounded-lg bg-ui-bg-base"
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
                value="csv"
                checked={reportType === "csv"}
                onChange={() => setReportType("csv")}
              />
              <Text>CSV (Raw Data)</Text>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="reportType"
                value="pdf"
                checked={reportType === "pdf"}
                onChange={() => setReportType("pdf")}
              />
              <Text>JSON Summary</Text>
            </label>
          </div>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={!selectedEquipment || !startDate || !endDate || isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      <div>
        <Heading level="h3" className="mb-4">
          Report Information
        </Heading>
        <div className="space-y-2 text-sm text-ui-fg-subtle bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
          <Text>• CSV reports include raw temperature and humidity data for analysis</Text>
          <Text>• JSON summary includes min/max/avg statistics and alert counts</Text>
          <Text>• Reports cover the selected date range (inclusive)</Text>
          <Text>• Data is pulled from historical storage</Text>
        </div>
      </div>
    </div>
  )
}
