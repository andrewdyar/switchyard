import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Text } from "@switchyard/ui"
import { TemperatureReading } from "../../../../../../dashboard/src/hooks/api/equipment"
import { format } from "date-fns"

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
          timeLabel: format(new Date(reading.recorded_at), "HH:mm"),
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
          timeLabel: format(new Date(reading.recorded_at), "HH:mm"),
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
      <div className="h-64 flex items-center justify-center">
        <Text className="text-ui-fg-subtle">Loading chart data...</Text>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Text className="text-ui-fg-subtle">No data available for selected time range</Text>
      </div>
    )
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="timeLabel"
            stroke="#6b7280"
            fontSize={12}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="temp"
            orientation="left"
            stroke="#ef4444"
            label={{ value: "Temperature (°F)", angle: -90, position: "insideLeft" }}
          />
          {humidityReadings.length > 0 && (
            <YAxis
              yAxisId="humidity"
              orientation="right"
              stroke="#3b82f6"
              label={{ value: "Humidity (%)", angle: 90, position: "insideRight" }}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
            labelFormatter={(value) => {
              const data = chartData.find((d) => d.timeLabel === value)
              return data ? format(new Date(data.time), "MMM dd, HH:mm") : value
            }}
          />
          <Legend />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Temperature (°F)"
          />
          {humidityReadings.length > 0 && (
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Humidity (%)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
