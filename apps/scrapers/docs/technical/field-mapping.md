# Unified Field Mapping

## Retailer to Goods Schema

| Goods Field | HEB | Walmart | Target | Costco | Central Market | Whole Foods | Trader Joe's |
|-------------|-----|---------|--------|--------|----------------|-------------|--------------|
| `external_id` | productId | usItemId | tcin | itemNumber | productId | asin | sku |
| `barcode` | upc | upc | primary_barcode | item_manufacturing_skus* | sku | (API lookup) | (computed EAN-8) |
| `name` | description | name | product_description.title | productName | description | title | item_title |
| `brand` | brand.name | brand | primary_brand.name | brand | brand.name | brand | brand |
| `cost_price` | currentPrice.amount | priceInfo.currentPrice.price | price.current_retail | priceTotal | currentPrice.amount | price.value | retail_price |
| `list_price` | originalPrice.amount | priceInfo.wasPrice.price | price.reg_retail | originalPrice | originalPrice.amount | - | - |
| `price_per_unit` | unitListPrice.amount | unitPrice.priceString* | formatted_unit_price | unitPriceAmount | unitListPrice.amount | price.perUnitPrice | - |
| `store_location` | aisle_location | productLocation[].displayValue | store_positions[].aisle** | - | aisle_location | location.aisle*** | - |

**Notes:**
- `*` Requires parsing/conversion
- `**` Requires separate fulfillment API call
- `***` Requires authentication

## Barcode Availability by Endpoint

| Retailer | Search | PDP | Notes |
|----------|--------|-----|-------|
| HEB | No | Yes | Direct field |
| Walmart | No | Yes | Direct field |
| Target | No | Yes | `primary_barcode` field |
| Costco | No | Yes | GTIN-14 → strip first 2 digits |
| Central Market | No | Yes | Same as HEB |
| Whole Foods | No | No | Requires ASIN-to-UPC API |
| Trader Joe's | No | No | Compute EAN-8 from SKU |

