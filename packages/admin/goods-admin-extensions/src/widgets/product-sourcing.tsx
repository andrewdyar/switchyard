/* @refresh reload */
import { defineWidgetConfig } from "@switchyard/admin-sdk"
import { Container, Heading, Text, Badge, Table } from "@switchyard/ui"
import { DetailWidgetProps, AdminProduct } from "@switchyard/framework/types"
import { useState, useEffect } from "react"
import { sdk } from "../lib/sdk"

type RetailerInfo = {
  store_name: string
  store_item_name: string | null
  stock_status: string | null
  list_price: number | null
  sale_price: number | null
  is_on_sale: boolean
  price_per_unit: number | null
  price_per_unit_uom: string | null
}

const ProductSourcingWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const [sourcingData, setSourcingData] = useState<RetailerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSourcingData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = (await sdk.client.fetch(
          `/admin/products/${product.id}/sourcing`
        )) as { sourcing?: RetailerInfo[] }

        if (data.sourcing) {
          setSourcingData(data.sourcing)
        } else {
          setSourcingData([])
        }
      } catch (err) {
        console.error("Failed to fetch sourcing data:", err)
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load sourcing information"
        setError(errorMessage)
        setSourcingData([])
      } finally {
        setLoading(false)
      }
    }

    fetchSourcingData()
  }, [product.id])

  const formatPrice = (priceInCents: number | null): string => {
    if (priceInCents === null) return "N/A"
    return `$${(priceInCents / 100).toFixed(2)}`
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
    return (
      storeNames[storeName.toLowerCase()] ||
      storeName.charAt(0).toUpperCase() + storeName.slice(1)
    )
  }

  const getStockStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusConfig: Record<
      string,
      { label: string; color: "green" | "red" | "yellow" }
    > = {
      in_stock: { label: "In Stock", color: "green" },
      out_of_stock: { label: "Out of Stock", color: "red" },
      limited: { label: "Limited", color: "yellow" },
    }

    const config = statusConfig[status] || { label: status, color: "yellow" }
    return (
      <Badge color={config.color} size="2xsmall">
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Product Sourcing</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading sourcing information...</Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Product Sourcing</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-red-500">{error}</Text>
        </div>
      </Container>
    )
  }

  if (sourcingData.length === 0) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Product Sourcing</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">
            No retailer mappings found for this product.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Sourcing</Heading>
      </div>
      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Retailer</Table.HeaderCell>
              <Table.HeaderCell>Item Name</Table.HeaderCell>
              <Table.HeaderCell>Price</Table.HeaderCell>
              <Table.HeaderCell>Unit Price</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sourcingData.map((retailer, index) => (
              <Table.Row key={index}>
                <Table.Cell>
                  <Text size="small" weight="plus">
                    {formatStoreName(retailer.store_name)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {retailer.store_item_name || "-"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    {retailer.is_on_sale && retailer.sale_price ? (
                      <>
                        <Text size="small" className="line-through text-ui-fg-muted">
                          {formatPrice(retailer.list_price)}
                        </Text>
                        <Text size="small" weight="plus" className="text-red-500">
                          {formatPrice(retailer.sale_price)}
                        </Text>
                        <Badge color="red" size="2xsmall">
                          On Sale
                        </Badge>
                      </>
                    ) : (
                      <Text size="small" weight="plus">
                        {formatPrice(retailer.list_price)}
                      </Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {retailer.price_per_unit ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      {formatPrice(retailer.price_per_unit)}/
                      {retailer.price_per_unit_uom || "unit"}
                    </Text>
                  ) : (
                    <Text size="small" className="text-ui-fg-muted">
                      -
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>{getStockStatusBadge(retailer.stock_status)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSourcingWidget
