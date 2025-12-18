import { useMemo } from "react"
import { Text } from "@switchyard/ui"
import { TemperatureReading } from "@switchyard/dashboard/hooks/api/equipment"

interface TemperatureChartProps {
  temperatureReadings: TemperatureReading[]
  humidityReadings: TemperatureReading[]
  isLoading?: boolean
}

export const TemperatureChart = ({
  temperatureReadings,
  humidityReadings,
  isLoading,
}: TemperatureChartProps) => {
  const chartData = useMemo(() => {
    // Combine readings by timestamp
    const dataMap = new Map<number, {
      time: number
      timeLabel: string
      temperature: number | null
      humidity: number | null
      tempStatus: number | null
    }>()

    temperatureReadings.forEach((reading) => {
      const time = new Date(reading.recorded_at).getTime()
      if (!dataMap.has(time)) {
        dataMap.set(time, {
          time,
          timeLabel: new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: null,
          humidity: null,
          tempStatus: null,
        })
      }
      const entry = dataMap.get(time)!
      entry.temperature = reading.value
      entry.tempStatus = reading.threshold_status
    })

    humidityReadings.forEach((reading) => {
      const time = new Date(reading.recorded_at).getTime()
      if (!dataMap.has(time)) {
        dataMap.set(time, {
          time,
          timeLabel: new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: null,
          humidity: null,
          tempStatus: null,
        })
      }
      const entry = dataMap.get(time)!
      entry.humidity = reading.value
    })

    return Array.from(dataMap.values()).sort((a, b) => a.time - b.time)
  }, [temperatureReadings, humidityReadings])

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-ui-bg-subtle rounded-lg">
        <Text className="text-ui-fg-subtle">Loading chart data...</Text>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-ui-bg-subtle rounded-lg">
        <Text className="text-ui-fg-subtle">No data available for selected time range</Text>
      </div>
    )
  }

  // Simple chart visualization using CSS (basic line representation)
  const tempValues = chartData.filter(d => d.temperature !== null).map(d => d.temperature!)
  const minTemp = Math.min(...tempValues)
  const maxTemp = Math.max(...tempValues)
  const tempRange = maxTemp - minTemp || 1

  return (
    <div className="bg-ui-bg-subtle rounded-lg p-4">
      <div className="flex justify-between mb-4">
        <div>
          <Text size="small" className="text-ui-fg-subtle">Temperature Range</Text>
          <Text weight="plus">{minTemp.toFixed(1)}°F - {maxTemp.toFixed(1)}°F</Text>
        </div>
        <div className="text-right">
          <Text size="small" className="text-ui-fg-subtle">Data Points</Text>
          <Text weight="plus">{chartData.length}</Text>
        </div>
      </div>
      
      <div className="h-48 flex items-end gap-0.5 bg-ui-bg-base rounded p-2">
        {chartData.slice(-50).map((point, idx) => {
          const height = point.temperature !== null 
            ? ((point.temperature - minTemp) / tempRange) * 100
            : 0
          const color = point.tempStatus === 1 
            ? 'bg-green-400' 
            : point.tempStatus && point.tempStatus >= 4 
              ? 'bg-red-400' 
              : point.tempStatus && point.tempStatus >= 2
                ? 'bg-orange-400'
                : 'bg-blue-400'
          
          return (
            <div
              key={idx}
              className={`flex-1 ${color} rounded-t transition-all hover:opacity-80`}
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${point.timeLabel}: ${point.temperature?.toFixed(1)}°F`}
            />
          )
        })}
      </div>
      
      <div className="flex justify-between mt-2">
        <Text size="small" className="text-ui-fg-muted">
          {chartData[0]?.timeLabel}
        </Text>
        <Text size="small" className="text-ui-fg-muted">
          {chartData[chartData.length - 1]?.timeLabel}
        </Text>
      </div>
    </div>
  )
}
