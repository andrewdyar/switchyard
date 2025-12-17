/**
 * Scraper Card Component
 * 
 * Reusable card component for each retailer scraper module.
 * Displays retailer name, store selection, run/stop button, and progress tracking.
 */

import { Container, Heading, Text, Select, Button, Badge } from "@switchyard/ui"
import { TriangleRightMini, XCircleSolid } from "@switchyard/icons"
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react"

type ScraperStatus = "idle" | "running" | "completed" | "error"

interface ScraperCardProps {
  retailerName: string
  defaultStore: string
  onRun?: () => void
  onStop?: () => void
  runRef?: (runFn: () => void) => void
}

const ScraperCard = forwardRef<{ run: () => void; stop: () => void }, ScraperCardProps>(
  ({ retailerName, defaultStore, onRun, onStop, runRef }, ref) => {
    const [selectedStore, setSelectedStore] = useState(defaultStore)
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>("")
    const [status, setStatus] = useState<ScraperStatus>("idle")
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const handleRun = () => {
      if (onRun) {
        onRun()
      }
      setIsRunning(true)
      setStatus("running")
      setProgress(0)
      setEstimatedTimeRemaining("10s")

      // Simulate progress over 10 seconds
      const startTime = Date.now()
      const duration = 10000 // 10 seconds
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.min((elapsed / duration) * 100, 100)
        setProgress(newProgress)

        const remaining = Math.max(0, duration - elapsed)
        const remainingSeconds = Math.ceil(remaining / 1000)
        setEstimatedTimeRemaining(`${remainingSeconds}s`)

        if (newProgress >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsRunning(false)
          setStatus("completed")
          setEstimatedTimeRemaining("")
          // Reset to idle after 2 seconds
          setTimeout(() => {
            setStatus("idle")
            setProgress(0)
          }, 2000)
        }
      }, 100)
    }

    const handleStop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsRunning(false)
      setStatus("idle")
      setProgress(0)
      setEstimatedTimeRemaining("")
      if (onStop) {
        onStop()
      }
    }

    // Expose run function via ref
    useEffect(() => {
      if (runRef) {
        runRef(handleRun)
      }
    }, [runRef])

    useImperativeHandle(ref, () => ({
      run: handleRun,
      stop: handleStop,
    }))

    useEffect(() => {
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, [])

    const getStatusBadge = () => {
      switch (status) {
        case "running":
          return <Badge color="blue">Running</Badge>
        case "completed":
          return <Badge color="green">Completed</Badge>
        case "error":
          return <Badge color="red">Error</Badge>
        default:
          return <Badge color="grey">Idle</Badge>
      }
    }

    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Heading level="h3">{retailerName}</Heading>
            {getStatusBadge()}
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Store Selection and Run/Stop Button on same line */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="small" className="text-ui-fg-subtle whitespace-nowrap">Store:</Text>
              <Select
                value={selectedStore}
                onValueChange={setSelectedStore}
                disabled={isRunning}
              >
                <Select.Trigger className="w-[180px]">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={defaultStore}>{defaultStore}</Select.Item>
                </Select.Content>
              </Select>
            </div>

            {isRunning ? (
              <Button
                onClick={handleStop}
                variant="danger"
              >
                <XCircleSolid className="mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleRun}
                disabled={isRunning}
                variant="primary"
              >
                <TriangleRightMini className="mr-2" />
                Run
              </Button>
            )}
          </div>

          {/* Progress Bar (only visible when running) */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Progress
                </Text>
                {estimatedTimeRemaining && (
                  <Text size="small" className="text-ui-fg-subtle">
                    {estimatedTimeRemaining} remaining
                  </Text>
                )}
              </div>
              <div className="w-full bg-ui-bg-subtle rounded-full h-2 overflow-hidden">
                <div
                  className="bg-ui-bg-interactive h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <Text size="xsmall" className="text-ui-fg-subtle text-right">
                {Math.round(progress)}%
              </Text>
            </div>
          )}
        </div>
      </Container>
    )
  }
)

ScraperCard.displayName = "ScraperCard"

export { ScraperCard }
