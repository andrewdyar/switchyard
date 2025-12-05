/* @refresh reload */
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button } from "@medusajs/ui"
import { PlaySolid, Tools } from "@medusajs/icons"
import ScraperCard from "../../components/scraper-card"
import { useState, useRef } from "react"

const ScrapersPage = () => {
  // Retailer configuration with default stores
  const retailers = [
    { name: "HEB", store: "HEB Austin" },
    { name: "Walmart", store: "Walmart Austin" },
    { name: "Costco", store: "Costco Austin" },
    { name: "Target", store: "Target Austin" },
    { name: "Central Market", store: "Central Market Austin" },
    { name: "Whole Foods", store: "Whole Foods Austin" },
    { name: "Trader Joe's", store: "Trader Joe's Austin" },
  ]

  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set())
  const scraperRunRefs = useRef<Map<string, () => void>>(new Map())

  const handleRunAll = () => {
    // Run all scrapers that aren't already running
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

  const allRunning = runningScrapers.size === retailers.length
  const anyRunning = runningScrapers.size > 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Scrapers</Heading>
        <Button onClick={handleRunAll} disabled={allRunning} variant="primary">
          <PlaySolid className="mr-2" />
          Run All
        </Button>
      </div>

      <div className="px-6 py-6">
        <div className="space-y-4">
          {retailers.map((retailer) => (
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
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Scrapers",
  icon: Tools,
})

export default ScrapersPage
