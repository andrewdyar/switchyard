import { Container, Heading, Button, Text, Input, Select, Badge } from "@switchyard/ui"
import { PlaySolid, Tools, ClockSolid, DocumentTextSolid } from "@switchyard/icons"
import { ScraperCard } from "../../../components/scraper-card"
import { useState, useRef, useEffect } from "react"

type TabId = "run" | "schedule" | "logs"

interface ScheduleConfig {
  enabled: boolean
  time: string // HH:MM format
  days: string[] // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
}

interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error"
  message: string
}

const RETAILERS = [
  { id: "heb", name: "HEB", store: "HEB Austin" },
  { id: "walmart", name: "Walmart", store: "Walmart Austin" },
  { id: "costco", name: "Costco", store: "Costco Austin" },
  { id: "target", name: "Target", store: "Target Austin" },
  { id: "central_market", name: "Central Market", store: "Central Market Austin" },
  { id: "whole_foods", name: "Whole Foods", store: "Whole Foods Austin" },
  { id: "trader_joes", name: "Trader Joe's", store: "Trader Joe's Austin" },
]

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
]

export const ScrapersPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>("run")
  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set())
  const scraperRunRefs = useRef<Map<string, () => void>>(new Map())

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: true,
    time: "03:00",
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  })
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)

  // Logs state
  const [selectedScraper, setSelectedScraper] = useState(RETAILERS[0].id)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const handleRunAll = () => {
    scraperRunRefs.current.forEach((runFn, retailerName) => {
      if (!runningScrapers.has(retailerName)) {
        runFn()
      }
    })
  }

  const handleScraperRun = (retailerName: string) => {
    setRunningScrapers((prev) => new Set(prev).add(retailerName))
  }

  const handleScraperStop = (retailerName: string) => {
    setRunningScrapers((prev) => {
      const next = new Set(prev)
      next.delete(retailerName)
      return next
    })
  }

  const handleSaveSchedule = async () => {
    setScheduleLoading(true)
    try {
      // TODO: Call API to update cron schedule
      // For now, simulate save
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setScheduleSaved(true)
      setTimeout(() => setScheduleSaved(false), 3000)
    } finally {
      setScheduleLoading(false)
    }
  }

  const toggleDay = (dayId: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.includes(dayId)
        ? prev.days.filter((d) => d !== dayId)
        : [...prev.days, dayId],
    }))
  }

  // Load logs when scraper selection changes
  useEffect(() => {
    if (activeTab === "logs") {
      setLogsLoading(true)
      // TODO: Connect to real log stream via WebSocket or polling
      // For now, show placeholder logs
      const mockLogs: LogEntry[] = [
        { timestamp: new Date().toISOString(), level: "info", message: `Starting ${selectedScraper} scraper...` },
        { timestamp: new Date().toISOString(), level: "info", message: "Connecting to retailer API..." },
        { timestamp: new Date().toISOString(), level: "info", message: "Fetching categories..." },
      ]
      setTimeout(() => {
        setLogs(mockLogs)
        setLogsLoading(false)
      }, 500)
    }
  }, [selectedScraper, activeTab])

  const allRunning = runningScrapers.size === RETAILERS.length

  const tabs = [
    { id: "run" as TabId, label: "Run Scrapers", icon: Tools },
    { id: "schedule" as TabId, label: "Run Schedule", icon: ClockSolid },
    { id: "logs" as TabId, label: "Logs", icon: DocumentTextSolid },
  ]

  const getCronExpression = () => {
    const [hours, minutes] = schedule.time.split(":")
    const dayMap: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    }
    const sortedDays = schedule.days
      .map((d) => dayMap[d])
      .sort((a, b) => a - b)
      .join(",")
    return `${minutes} ${hours} * * ${sortedDays || "*"}`
  }

  return (
    <Container className="divide-y p-0">
      {/* Header with tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Scrapers</Heading>
          {activeTab === "run" && (
            <Button onClick={handleRunAll} disabled={allRunning} variant="primary">
              <PlaySolid className="mr-2" />
              Run All
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-ui-border-base -mx-6 px-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                  isActive
                    ? "border-ui-fg-base text-ui-fg-base"
                    : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                <Icon className="h-4 w-4" />
                <Text size="small" weight={isActive ? "plus" : "regular"}>
                  {tab.label}
                </Text>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {/* Run Scrapers Tab */}
        {activeTab === "run" && (
          <div className="space-y-4">
            {RETAILERS.map((retailer) => (
              <ScraperCard
                key={retailer.name}
                retailerName={retailer.name}
                defaultStore={retailer.store}
                onRun={() => handleScraperRun(retailer.name)}
                onStop={() => handleScraperStop(retailer.name)}
                runRef={(runFn) => {
                  scraperRunRefs.current.set(retailer.name, runFn)
                }}
              />
            ))}
          </div>
        )}

        {/* Run Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-ui-bg-subtle rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Heading level="h2">Scheduled Scraping</Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    Configure when all scrapers run automatically
                  </Text>
                </div>
                <div className="flex items-center gap-3">
                  <Text size="small" className="text-ui-fg-subtle">
                    {schedule.enabled ? "Enabled" : "Disabled"}
                  </Text>
                  <button
                    onClick={() => setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      schedule.enabled ? "bg-ui-tag-green-bg" : "bg-ui-bg-switch-off"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        schedule.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Time Selection */}
                <div>
                  <Text weight="plus" className="mb-2 block">
                    Run Time
                  </Text>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-40"
                  />
                  <Text size="small" className="text-ui-fg-subtle mt-1">
                    Time is in your local timezone
                  </Text>
                </div>

                {/* Day Selection */}
                <div>
                  <Text weight="plus" className="mb-2 block">
                    Run Days
                  </Text>
                  <div className="flex gap-2">
                    {DAYS.map((day) => {
                      const isSelected = schedule.days.includes(day.id)
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(day.id)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                              : "bg-ui-bg-base border border-ui-border-base text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Cron Expression Preview */}
                <div className="bg-ui-bg-base rounded-md p-4 border border-ui-border-base">
                  <Text size="small" className="text-ui-fg-subtle mb-1">
                    Cron Expression
                  </Text>
                  <code className="text-sm font-mono text-ui-fg-base">
                    {getCronExpression()}
                  </code>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={handleSaveSchedule}
                    disabled={scheduleLoading}
                  >
                    {scheduleLoading ? "Saving..." : "Save Schedule"}
                  </Button>
                  {scheduleSaved && (
                    <Badge color="green">Saved!</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Scrapers in Schedule */}
            <div>
              <Heading level="h2" className="mb-4">
                Scrapers in Schedule
              </Heading>
              <Text className="text-ui-fg-subtle mb-4">
                All scrapers run in sequence during the scheduled time
              </Text>
              <div className="space-y-2">
                {RETAILERS.map((retailer, index) => (
                  <div
                    key={retailer.id}
                    className="flex items-center gap-3 p-3 bg-ui-bg-subtle rounded-md"
                  >
                    <span className="text-ui-fg-subtle text-sm w-6">{index + 1}.</span>
                    <Text weight="plus">{retailer.name}</Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      ({retailer.store})
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {/* Scraper Selector */}
            <div className="flex items-center gap-4">
              <Text weight="plus">Viewing logs for:</Text>
              <Select
                value={selectedScraper}
                onValueChange={setSelectedScraper}
              >
                <Select.Trigger className="w-[200px]">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {RETAILERS.map((retailer) => (
                    <Select.Item key={retailer.id} value={retailer.id}>
                      {retailer.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {/* Log Output */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
              <div className="bg-ui-bg-subtle px-4 py-2 border-b border-ui-border-base flex items-center justify-between">
                <Text size="small" weight="plus">
                  {RETAILERS.find((r) => r.id === selectedScraper)?.name} Logs
                </Text>
                <Badge color={logsLoading ? "orange" : "grey"}>
                  {logsLoading ? "Loading..." : "Live"}
                </Badge>
              </div>
              <div className="h-[400px] overflow-auto p-4 font-mono text-sm bg-ui-contrast-bg-base">
                {logs.length === 0 && !logsLoading && (
                  <div className="text-ui-fg-subtle text-center py-8">
                    No logs available. Run the scraper to see output.
                  </div>
                )}
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`py-1 ${
                      log.level === "error"
                        ? "text-ui-tag-red-text"
                        : log.level === "warn"
                        ? "text-ui-tag-orange-text"
                        : "text-ui-contrast-fg-primary"
                    }`}
                  >
                    <span className="text-ui-fg-subtle mr-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="mr-2">[{log.level.toUpperCase()}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Log Actions */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setLogs([])}>
                Clear Logs
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const logText = logs.map((l) => 
                    `${new Date(l.timestamp).toISOString()} [${l.level.toUpperCase()}] ${l.message}`
                  ).join("\n")
                  navigator.clipboard.writeText(logText)
                }}
              >
                Copy to Clipboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
