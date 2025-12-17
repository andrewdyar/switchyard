/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Button, Text } from "@switchyard/ui"
import { PlaySolid, Tools, Squares2X2Solid } from "@switchyard/icons"
import { Link, useLocation } from "react-router-dom"
import ScraperCard from "../../components/scraper-card"
import { useState, useRef } from "react"

const ScrapersPage = () => {
  const location = useLocation()
  
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

  // Navigation tabs for Scrapers section
  const tabs = [
    { label: "Run Scrapers", path: "/scrapers", icon: Tools },
    { label: "Scraped Products", path: "/scrapers/scraped-products", icon: Squares2X2Solid },
  ]

  return (
    <Container className="divide-y p-0">
      {/* Header with tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Scrapers</Heading>
          <Button onClick={handleRunAll} disabled={allRunning} variant="primary">
            <PlaySolid className="mr-2" />
            Run All
          </Button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-ui-border-base -mx-6 px-6">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path
            const Icon = tab.icon
            return (
              <Link
                key={tab.path}
                to={tab.path}
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
              </Link>
            )
          })}
        </div>
      </div>

      {/* Scraper Cards */}
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
