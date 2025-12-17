/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Badge,
  Text,
  Input,
  Select,
  Button,
} from "@switchyard/ui"
import { ArrowPath, MagnifyingGlass, Squares2X2Solid, Tools } from "@switchyard/icons"
import { useState, useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import { useScrapedProducts, useCategories } from "../../../hooks/use-scraped-products"
import { ScrapedProductListItem } from "../../../lib/supabase"

const PAGE_SIZE = 20

// Shared tab navigation component
const ScraperTabs = () => {
  const location = useLocation()
  
  const tabs = [
    { label: "Run Scrapers", path: "/scrapers", icon: Tools },
    { label: "Scraped Products", path: "/scrapers/scraped-products", icon: Squares2X2Solid },
  ]

  return (
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
  )
}

const ScrapedProductsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<string>("")

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError, error, refetch } = useScrapedProducts({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category: category || undefined,
  })

  const { data: categories } = useCategories()

  const products = data?.products || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const formatPrice = (priceInCents: number | null): string => {
    if (priceInCents === null) return "—"
    return `$${(priceInCents / 100).toFixed(2)}`
  }

  const formatLastSeen = (dateStr: string | null): string => {
    if (!dateStr) return "—"
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getFreshnessColor = (dateStr: string | null): "green" | "orange" | "red" | "grey" => {
    if (!dateStr) return "grey"
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 24) return "green"
    if (diffHours < 168) return "orange" // 7 days
    return "red"
  }

  if (isError) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Scraped Products</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-red-500">
            Error loading products: {error?.message || "Unknown error"}
          </Text>
          <Button onClick={() => refetch()} className="mt-4">
            <ArrowPath className="mr-2" />
            Retry
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header with tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Scrapers</Heading>
          <div className="flex items-center gap-2">
            <Text size="small" className="text-ui-fg-subtle">
              {totalCount.toLocaleString()} products
            </Text>
            <Button size="small" variant="secondary" onClick={() => refetch()}>
              <ArrowPath className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <ScraperTabs />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-subtle" />
          <Input
            placeholder="Search by name, barcode, or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <Select.Trigger className="w-[200px]">
            <Select.Value placeholder="All Categories" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">All Categories</Select.Item>
            {(categories || []).map((cat) => (
              <Select.Item key={cat.id} value={cat.id}>
                {cat.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPath className="animate-spin text-ui-fg-subtle mr-2" />
            <Text className="text-ui-fg-subtle">Loading products...</Text>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Squares2X2Solid className="text-ui-fg-subtle mb-4 h-12 w-12" />
            <Text className="text-ui-fg-subtle">No products found</Text>
            {debouncedSearch && (
              <Text size="small" className="text-ui-fg-muted mt-1">
                Try adjusting your search or filters
              </Text>
            )}
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Barcode</Table.HeaderCell>
                <Table.HeaderCell>Category</Table.HeaderCell>
                <Table.HeaderCell>Retailers</Table.HeaderCell>
                <Table.HeaderCell>Lowest Price</Table.HeaderCell>
                <Table.HeaderCell>Last Seen</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((product: ScrapedProductListItem) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <Link
                      to={`/scrapers/scraped-products/${product.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-ui-bg-subtle flex items-center justify-center">
                          <Squares2X2Solid className="text-ui-fg-subtle h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <Text weight="plus" className="line-clamp-1">
                          {product.name}
                        </Text>
                        {product.brand && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {product.brand}
                          </Text>
                        )}
                      </div>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="font-mono">
                      {product.barcode || "—"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {product.category_name || "Uncategorized"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={product.retailer_count > 0 ? "blue" : "grey"}>
                      {product.retailer_count} retailer{product.retailer_count !== 1 ? "s" : ""}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text weight="plus" className="text-green-600">
                      {formatPrice(product.lowest_price)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getFreshnessColor(product.last_seen_at)} size="small">
                      {formatLastSeen(product.last_seen_at)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {product.is_linked_to_product ? (
                      <Badge color="green" size="small">Sellable</Badge>
                    ) : (
                      <Badge color="grey" size="small">Not Listed</Badge>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)} of{" "}
            {totalCount.toLocaleString()}
          </Text>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Text size="small" className="px-2">
              Page {page} of {totalPages}
            </Text>
            <Button
              size="small"
              variant="secondary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Scraped Products",
})

export default ScrapedProductsPage
