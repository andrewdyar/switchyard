/**
 * Goods Admin Extensions
 * 
 * Custom admin widgets and routes for Goods Grocery.
 */

// Export widgets
export * from "./widgets/product-attributes"
export * from "./widgets/product-sourcing"
export * from "./widgets/hide-product-sections"
export * from "./widgets/role-management"
export * from "./widgets/user-role-assignment"
export * from "./widgets/print-shelf-label"

// Export routes
export * from "./routes/scrapers/page"
export * from "./routes/scrapers/scraped-products/page"
export * from "./routes/login/page"

// Export components
export * from "./components/robot-icon"
export * from "./components/scraper-card"
export * from "./components/print-label-button"

// Export hooks
export * from "./hooks/use-scraped-products"
export * from "./hooks/use-label-printing"

// Export lib
export * from "./lib/supabase"



