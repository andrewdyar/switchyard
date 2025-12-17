# Target

## API Overview
- **Type**: REST (Redsky API)
- **Base URL**: `https://redsky.target.com/redsky_aggregations/v1/`
- **Authentication**: API Key required (`key` parameter)

## Endpoints

### Category/Search
- **URL**: `GET /web/plp_search_v2`
- **Key Parameters**:
  - `key`: API key (required)
  - `keyword`: Search query
  - `store_id`: Store identifier

### Product Detail (PDP)
- **URL**: `GET /web/pdp_client_v1`
- **Key Parameters**:
  - `key`: API key
  - `tcin`: Target item ID
  - `store_id`: Store identifier

### Fulfillment/Aisle Location
- **URL**: `GET /web/product_fulfillment_and_variation_hierarchy_v1`
- **Key Parameters**:
  - `key`: API key
  - `tcin`: Target item ID
  - `store_id`: Store identifier
  - `required_store_id`: Same as store_id

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `tcin` | `external_id` | Target item ID |
| `primary_barcode` | `barcode` | 12-digit UPC (PDP only) |
| `product_description.title` | `name` | Product name |
| `primary_brand.name` | `brand` | Brand name |
| `price.current_retail` | `cost_price` | Current price |
| `store_positions[].aisle` | `store_aisle` | Aisle number |
| `store_positions[].block` | `store_block` | Store section |

## Aisle Location Structure

```json
{
  "store_positions": [
    {
      "aisle": 42,
      "block": "G",
      "floor": "1"
    }
  ]
}
```

## Python Example

```python
def extract_target_product(item: dict) -> dict:
    """Extract product data from Target PDP response."""
    price = item.get('price', {})
    
    return {
        'external_id': item.get('tcin'),
        'barcode': item.get('primary_barcode'),
        'name': item.get('product_description', {}).get('title'),
        'brand': item.get('primary_brand', {}).get('name'),
        'cost_price': price.get('current_retail'),
    }

def extract_target_location(fulfillment_data: dict) -> dict:
    """Extract aisle from fulfillment API."""
    store_options = fulfillment_data.get('data', {}).get('product_fulfillment', {}).get('store_options', [])
    
    for option in store_options:
        positions = option.get('store_positions', [])
        if positions:
            pos = positions[0]
            return {
                'store_aisle': pos.get('aisle'),
                'store_block': pos.get('block'),
            }
    return {}
```

## Category Mapping

Target uses a nested category structure (parent category → subcategory). The complete mapping includes 232 subcategories mapped to Goods categories, with 92 subcategories excluded (alcohol, promotional categories, non-food items, etc.).

**Key Mapping Examples:**
- `Produce > Fresh Fruit` → `produce > fruit`
- `Meat & Seafood > Beef` → `meat_seafood > beef`
- `Frozen Foods > Ice Cream & Novelties` → `frozen > ice_cream`
- `Snacks > Chips` → `snacks > chips`
- `Beverages > Coffee` → `beverages > coffee_tea`

**Excluded Categories:**
- Alcohol (Wine, Beer, Liquor, and all subcategories)
- Fresh Flowers & Plants
- Bar & Wine Tools
- Food Gifts (duplicate categories)
- Emergency Food

See [Category Mapping documentation](/technical/category-mapping.md#target-category-mapping) for the complete mapping table.

## Notes
- UPC in PDP via `primary_barcode` field
- Aisle location requires separate fulfillment API call
- API key required for all requests
- Category mapping uses nested structure (parent → subcategory)

