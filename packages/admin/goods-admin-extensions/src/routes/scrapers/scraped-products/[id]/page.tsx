/* @refresh reload */
import { defineRouteConfig } from "@switchyard/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  Table,
  Button,
} from "@switchyard/ui"
import { ArrowUturnLeft, ArrowPath, CheckCircleSolid, XCircleSolid } from "@switchyard/icons"
import { useParams, Link } from "react-router-dom"
import { useScrapedProduct } from "../../../../hooks/use-scraped-products"
import { RetailerComparison } from "../../../../lib/supabase"

const ScrapedProductDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: product, isLoading, isError, error, refetch } = useScrapedProduct(id || "")

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
    if (diffHours < 168) return "orange"
    return "red"
  }

  const formatStoreName = (storeName: string): string => {
    const storeNames: Record<string, string> = {
      heb: "HEB",
      walmart: "Walmart",
      costco: "Costco",
      target: "Target",
      whole_foods: "Whole Foods",
      central_market: "Central Market",
      trader_joes: "Trader Joe's",
    }
    return storeNames[storeName.toLowerCase()] || storeName
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/scrapers/scraped-products">
              <Button size="small" variant="secondary">
                <ArrowUturnLeft className="mr-2" />
                Back
              </Button>
            </Link>
            <Heading level="h1">Loading...</Heading>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <ArrowPath className="animate-spin text-ui-fg-subtle mr-2" />
          <Text className="text-ui-fg-subtle">Loading product details...</Text>
        </div>
      </Container>
    )
  }

  if (isError || !product) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/scrapers/scraped-products">
              <Button size="small" variant="secondary">
                <ArrowUturnLeft className="mr-2" />
                Back
              </Button>
            </Link>
            <Heading level="h1">Product Not Found</Heading>
          </div>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-red-500">
            {error?.message || "Product not found or unable to load."}
          </Text>
          <Button onClick={() => refetch()} className="mt-4">
            <ArrowPath className="mr-2" />
            Retry
          </Button>
        </div>
      </Container>
    )
  }

  // Find the lowest price retailer
  const lowestPriceRetailer = product.retailers.reduce<RetailerComparison | null>(
    (lowest, retailer) => {
      if (retailer.price === null) return lowest
      if (lowest === null || (lowest.price !== null && retailer.price < lowest.price)) {
        return retailer
      }
      return lowest
    },
    null
  )

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/scrapers/scraped-products">
            <Button size="small" variant="secondary">
              <ArrowUturnLeft className="mr-2" />
              Back
            </Button>
          </Link>
          <Heading level="h1">{product.name}</Heading>
          {product.is_linked_to_product && (
            <Badge color="green">Sellable</Badge>
          )}
        </div>
        <Button size="small" variant="secondary" onClick={() => refetch()}>
          <ArrowPath className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Product Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-6">
        {/* Image */}
        <div className="flex justify-center md:justify-start">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-48 w-48 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="h-48 w-48 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
              <Text className="text-ui-fg-subtle">No Image</Text>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle">Barcode</Text>
              <Text weight="plus" className="font-mono">{product.barcode || "—"}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Brand</Text>
              <Text weight="plus">{product.brand || "—"}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Size</Text>
              <Text weight="plus">
                {product.size ? `${product.size} ${product.size_uom || ""}` : "—"}
              </Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Category</Text>
              <Text weight="plus">{product.category?.name || "Uncategorized"}</Text>
            </div>
          </div>

          {product.description && (
            <div>
              <Text size="small" className="text-ui-fg-subtle">Description</Text>
              <Text className="line-clamp-3">{product.description}</Text>
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="bg-ui-bg-subtle px-4 py-2 rounded-lg">
              <Text size="small" className="text-ui-fg-subtle">Available at</Text>
              <Text weight="plus" className="text-lg">
                {product.retailers.filter((r) => r.is_available).length} retailers
              </Text>
            </div>
            {lowestPriceRetailer && (
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <Text size="small" className="text-green-700">Lowest Price</Text>
                <Text weight="plus" className="text-lg text-green-700">
                  {formatPrice(lowestPriceRetailer.price)} at{" "}
                  {formatStoreName(lowestPriceRetailer.store_name)}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Retailer Comparison Table */}
      <div className="px-6 py-6">
        <Heading level="h2" className="mb-4">Retailer Comparison</Heading>
        
        {product.retailers.length === 0 ? (
          <div className="text-center py-8 bg-ui-bg-subtle rounded-lg">
            <Text className="text-ui-fg-subtle">No retailer data available for this product.</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Retailer</Table.HeaderCell>
                <Table.HeaderCell>Item Name</Table.HeaderCell>
                <Table.HeaderCell>Price</Table.HeaderCell>
                <Table.HeaderCell>Unit Price</Table.HeaderCell>
                <Table.HeaderCell>Aisle</Table.HeaderCell>
                <Table.HeaderCell>Available</Table.HeaderCell>
                <Table.HeaderCell>Last Seen</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {product.retailers.map((retailer: RetailerComparison, index: number) => {
                const isLowest =
                  lowestPriceRetailer &&
                  retailer.store_name === lowestPriceRetailer.store_name &&
                  retailer.price === lowestPriceRetailer.price

                return (
                  <Table.Row key={`${retailer.store_name}-${index}`}>
                    <Table.Cell>
                      <Text weight="plus">{formatStoreName(retailer.store_name)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle line-clamp-1">
                        {retailer.store_item_name || "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {retailer.is_on_sale && retailer.sale_price ? (
                          <>
                            <Text size="small" className="line-through text-ui-fg-muted">
                              {formatPrice(retailer.list_price)}
                            </Text>
                            <Text weight="plus" className="text-red-600">
                              {formatPrice(retailer.sale_price)}
                            </Text>
                            <Badge color="red" size="small">Sale</Badge>
                          </>
                        ) : (
                          <Text weight="plus" className={isLowest ? "text-green-600" : ""}>
                            {formatPrice(retailer.price || retailer.list_price)}
                          </Text>
                        )}
                        {isLowest && !retailer.is_on_sale && (
                          <Badge color="green" size="small">Lowest</Badge>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {retailer.price_per_unit ? (
                        <Text size="small" className="text-ui-fg-subtle">
                          {formatPrice(retailer.price_per_unit)}/{retailer.price_per_unit_uom || "ea"}
                        </Text>
                      ) : (
                        <Text size="small" className="text-ui-fg-muted">—</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="font-mono">
                        {retailer.store_location || "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {retailer.is_available ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircleSolid className="h-4 w-4" />
                          <Text size="small">Yes</Text>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircleSolid className="h-4 w-4" />
                          <Text size="small">No</Text>
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={getFreshnessColor(retailer.last_seen_at)} size="small">
                        {formatLastSeen(retailer.last_seen_at)}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </div>

      {/* Actions */}
      {!product.is_linked_to_product && (
        <div className="px-6 py-6">
          <div className="bg-ui-bg-subtle rounded-lg p-6 text-center">
            <Text className="text-ui-fg-subtle mb-4">
              This product is not yet in your sellable catalog.
            </Text>
            <Button variant="primary" disabled>
              Add to Catalog (Coming Soon)
            </Button>
          </div>
        </div>
      )}
      {product.is_linked_to_product && product.linked_product_id && (
        <div className="px-6 py-6">
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <Text className="text-green-700 mb-4">
              This product is linked to a sellable product.
            </Text>
            <Link to={`/products/${product.linked_product_id}`}>
              <Button variant="secondary">
                View in Products
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Scraped Product Detail",
})

export default ScrapedProductDetailPage
