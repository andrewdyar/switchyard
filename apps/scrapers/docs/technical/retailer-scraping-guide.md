# Retailer Scraping Guide

> Comprehensive documentation for scraping product data from grocery retailers

---

## Quick Reference

| Retailer | API Type | UPC Available | Aisle Location | Price Per Unit | Implementation Status |
|----------|----------|---------------|----------------|----------------|----------------------|
| HEB | GraphQL | PDP | Yes | Yes | ✅ Production Ready |
| Walmart | GraphQL | PDP | Yes (zone+aisle) | Yes | 🚧 In Development |
| Target | REST | PDP | Fulfillment API | Yes | ✅ Production Ready |
| Costco | REST | PDP (GTIN-14) | No | Yes | ✅ Production Ready |
| Central Market | GraphQL | PDP | Yes | Yes | ✅ Production Ready |
| Whole Foods | HTML (__NEXT_DATA__) | ASIN→UPC (RocketSource) | Yes (auth required) | Yes | ✅ Production Ready |
| Trader Joe's | GraphQL | EAN-8 (computed) | No | Yes | ✅ Production Ready |

**Status Legend:**
- ✅ Production Ready - Fully implemented and tested
- 🚧 In Development - Partially implemented, working on issues
- 🟡 Not Started - Planned but not yet implemented

---

## Retailers

### HEB

#### API Overview
- **Type**: GraphQL
- **Base URL**: `https://www.heb.com/graphql`
- **Authentication**: None required (cookie-based session)
- **Rate Limiting**: Unknown, recommend 1-2 req/sec

#### Endpoints

##### 1. Category/Search
- **URL Pattern**: `POST https://www.heb.com/graphql`
- **Method**: POST
- **Operation**: `SearchResponse`
- **Key Parameters**:
  - `searchText`: Search query string
  - `storeId`: Store identifier
  - `categoryId`: Category filter
  - `limit`: Results per page (default 40)
  - `offset`: Pagination offset
- **Response Format**: JSON (GraphQL)

##### 2. Product Detail (PDP)
- **URL Pattern**: `POST https://www.heb.com/graphql`
- **Method**: POST
- **Operation**: `ProductPDP`
- **Key Parameters**:
  - `productId`: HEB product ID
  - `storeId`: Store identifier
- **Response Format**: JSON (GraphQL)

#### Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `productId` | `external_id` | HEB internal ID |
| `upc` | `barcode` | 12-digit UPC |
| `description` | `name` | Product name |
| `brand.name` | `brand` | Brand name |
| `currentPrice.amount` | `cost_price` | Current price |
| `originalPrice.amount` | `list_price` | Regular price |
| `unitListPrice.amount` | `price_per_unit` | Price per unit |
| `unitListPrice.unit` | `price_per_unit_uom` | oz, lb, ct, etc. |
| `size` | `size` | Package size |
| `image.url`, `images[]` | `image_urls` | Product images (up to 10, array) |
| `aisle_location` | `store_location` | Aisle info |
| `category.name` | `category` | Category name |
| `averageRating` | `rating` | Customer rating (internal use) |
| `reviewCount` | `review_count` | Number of reviews |

#### Barcode Strategy
- **Format**: UPC-12
- **Availability**: PDP response only
- **Extraction Method**: Direct field access
- **Field Path**: `data.product.upc`

#### In-Store Location
- **Availability**: Yes, store-specific
- **Field Path**: `data.product.aisle_location`
- **Format**: Free text (e.g., "Aisle 5", "Produce Section")
- **Notes**: Requires valid `storeId` for accurate location

#### Python Extraction Example

```python
def extract_heb_product(data: dict) -> dict:
    """Extract product data from HEB GraphQL response."""
    product = data.get('data', {}).get('product', {})
    
    # Extract images (up to 10)
    image_urls = []
    primary_image = product.get('image', {}).get('url')
    if primary_image:
        image_urls.append(primary_image)
    
    # Add additional images if available (e.g., from images array)
    additional_images = product.get('images', [])
    for img in additional_images[:9]:  # Limit to 10 total (1 primary + 9 additional)
        img_url = img.get('url') if isinstance(img, dict) else img
        if img_url and img_url not in image_urls:
            image_urls.append(img_url)
    
    return {
        'external_id': product.get('productId'),
        'barcode': product.get('upc'),
        'name': product.get('description'),
        'brand': product.get('brand', {}).get('name'),
        'cost_price': product.get('currentPrice', {}).get('amount'),
        'list_price': product.get('originalPrice', {}).get('amount'),
        'price_per_unit': product.get('unitListPrice', {}).get('amount'),
        'price_per_unit_uom': product.get('unitListPrice', {}).get('unit'),
        'size': product.get('size'),
        'image_urls': image_urls[:10],  # Limit to 10 images
        'store_location': product.get('aisle_location'),
        'category': product.get('category', {}).get('name'),
        'rating': product.get('averageRating'),
        'review_count': product.get('reviewCount'),
    }
```

#### Implementation Status
- **Status**: ✅ Production Ready
- **Scraper Location**: `scrapers/heb_scraper.py`
- **Last Scrape**: November 23, 2025
- **Products Scraped**: 60,882 products
- **Failed Products**: 352 products
- **Scrape Duration**: ~19 hours (69,124 seconds)

#### Scraping Method
1. **Category Discovery**: Discovers categories/departments from HEB's website structure via GraphQL API
2. **Dual Strategy**: Uses both category-based scraping and search-based discovery
3. **Pagination**: Handles pagination for each category
4. **Image Collection**: Extracts up to 10 images (primary + additional images array) from product data
5. **Product Storage**: 
   - Stores products directly to Supabase during scraping
   - Creates `product_store_mappings` entries for HEB store
   - Creates `product_pricing` entries with both ONLINE and CURBSIDE pricing contexts
   - Creates `product_skus` entries for SKU tracking
   - Creates `product_analytics` entries for analytics data
   - **Image Storage Logic**: Images are only stored in `product_images` table on first scrape when UPC is encountered. If images already exist for a product, they are not overwritten.
6. **UPC Extraction**: Fetched from PDP response (`data.product.upc`)
7. **Aisle Location**: Extracted from `aisle_location` field in product data

#### Notes & Limitations
- UPC only available in PDP, not search results
- Store-specific pricing and availability
- Session cookies may be required for some requests
- Implements persisted queries with SHA256 hashes

---

### Walmart

#### API Overview
- **Type**: GraphQL (Orchestra)
- **Base URL**: `https://www.walmart.com/orchestra/`
- **Authentication**: Cookie-based session
- **Rate Limiting**: Aggressive bot detection, use realistic headers

#### Endpoints

##### 1. Category/Search
- **URL Pattern**: `POST https://www.walmart.com/orchestra/home/graphql/search`
- **Method**: POST
- **Key Parameters**:
  - `query`: Search text
  - `cat_id`: Category ID (e.g., `976759_976794_7433209`)
  - `stores`: Store ID
  - `sort`: `best_match`, `price_low`, `price_high`
  - `page`: Page number
  - `ps`: Page size
  - `facet`: Filters (e.g., `fulfillment_method:Pickup`)
- **Response Format**: JSON (GraphQL)

##### 2. Product Detail (PDP)
- **URL Pattern**: `POST https://www.walmart.com/orchestra/pdp/graphql/ItemByIdBtf/{hash}/ip/{item_id}`
- **Method**: POST
- **Key Parameters**:
  - `item_id`: Walmart item ID (in URL path)
  - Store context via cookies
- **Response Format**: JSON (GraphQL)

#### Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `usItemId` | `external_id` | Walmart item ID |
| `upc` | `barcode` | 12-digit UPC (PDP only) |
| `name` | `name` | Product name |
| `brand` | `brand` | Brand name |
| `priceInfo.currentPrice.price` | `cost_price` | Current price |
| `priceInfo.wasPrice.price` | `list_price` | Original price |
| `priceInfo.unitPrice.priceString` | `price_per_unit` | e.g., "$1.47/lb" |
| `priceInfo.priceDisplayCodes.pricePerUnitUom` | `price_per_unit_uom` | Unit of measure |
| `productLocation[].displayValue` | `store_location` | Aisle display (e.g., "A12") |
| `productLocation[].aisle.zone` | `store_zone` | Zone letter (e.g., "A") |
| `productLocation[].aisle.aisle` | `store_aisle` | Aisle number (e.g., 12) |
| `imageInfo.thumbnailUrl`, `imageInfo.imageUrls[]` | `image_urls` | Product images (up to 10, array) |
| `averageRating` | `rating` | Customer rating (internal use) |
| `numberOfReviews` | `review_count` | Number of reviews |
| `snapEligible` | `snap_eligible` | SNAP/EBT eligible |

#### Barcode Strategy
- **Format**: UPC-12
- **Availability**: PDP response only
- **Extraction Method**: Direct field access
- **Field Path**: `data.product.upc`

#### In-Store Location
- **Availability**: Yes, store-specific
- **Field Path (Search)**: `itemStacks[].items[].productLocation[]`
- **Field Path (PDP)**: `product.productLocation[]`
- **Format**: Zone + Aisle number with displayValue
- **Structure**:
```json
{
  "productLocation": [
    {
      "displayValue": "A12",
      "aisle": {
        "zone": "A",
        "aisle": 12
      }
    }
  ]
}
```
- **Notes**: Requires `fulfillmentIntent=Pickup` and valid store selection. Some items return `null` if not stocked in the selected store.

#### Python Extraction Example

```python
def extract_walmart_product(item: dict) -> dict:
    """Extract product data from Walmart search/PDP response."""
    price_info = item.get('priceInfo', {})
    location = item.get('productLocation', [{}])[0] if item.get('productLocation') else {}
    
    # Parse price per unit (e.g., "$1.47/lb" -> 1.47, "lb")
    unit_price_str = price_info.get('unitPrice', {}).get('priceString', '')
    price_per_unit = None
    price_per_unit_uom = price_info.get('priceDisplayCodes', {}).get('pricePerUnitUom')
    
    if unit_price_str:
        import re
        match = re.match(r'\$?([\d.]+)/(\w+)', unit_price_str)
        if match:
            price_per_unit = float(match.group(1))
            price_per_unit_uom = match.group(2)
    
    # Extract images (up to 10)
    image_urls = []
    image_info = item.get('imageInfo', {})
    primary_image = image_info.get('thumbnailUrl') or image_info.get('imageUrl')
    if primary_image:
        image_urls.append(primary_image)
    
    # Add additional images if available
    additional_images = image_info.get('imageUrls', [])
    for img_url in additional_images[:9]:  # Limit to 10 total
        if img_url and img_url not in image_urls:
            image_urls.append(img_url)
    
    return {
        'external_id': item.get('usItemId'),
        'barcode': item.get('upc'),
        'name': item.get('name'),
        'brand': item.get('brand'),
        'cost_price': price_info.get('currentPrice', {}).get('price'),
        'list_price': price_info.get('wasPrice', {}).get('price'),
        'price_per_unit': price_per_unit,
        'price_per_unit_uom': price_per_unit_uom,
        'store_location': location.get('displayValue'),
        'store_zone': location.get('aisle', {}).get('zone'),
        'store_aisle': location.get('aisle', {}).get('aisle'),
        'image_urls': image_urls[:10],  # Limit to 10 images
        'rating': item.get('averageRating'),
        'review_count': item.get('numberOfReviews'),
        'snap_eligible': item.get('snapEligible'),
    }
```

#### Variable Weight Items

For items priced by weight (e.g., turkey), pricing structure differs:

```json
{
  "priceInfo": {
    "priceDisplayCodes": {
      "pricePerUnitUom": "/lb",
      "unitOfMeasure": "lb"
    },
    "currentPrice": {
      "price": 6.62,
      "priceString": "$6.62"
    },
    "unitPrice": {
      "priceString": "$1.47/lb"
    }
  }
}
```

#### Implementation Status
- **Status**: 🚧 In Development - Bot Detection Bypass
- **Scraper Location**: `scrapers/walmart_scraper.py`
- **Last Test**: November 29, 2025
- **Test Results**: 59 products scraped in test run
- **Current Issues**: Still encountering HTTP 429/412 errors from PerimeterX

#### Scraping Method
1. **Browser Automation**: Uses Playwright with `playwright-stealth` for bot detection bypass
2. **Proxy Support**: Integrated Webshare static residential proxies (20 proxies configured)
3. **Proxy Rotation**: Supports round-robin, random, and per-category strategies
4. **Session Management**: 
   - Establishes browser session by visiting homepage
   - Captures PerimeterX cookies automatically
   - Maintains session across requests
5. **Category Navigation**: Navigates to `/cp/food/{category_id}` URLs for human-like behavior
6. **Data Extraction**: Extracts from GraphQL API responses or `__NEXT_DATA__` JSON from HTML
7. **Fallback Strategy**: Falls back to `requests.Session` with proxy rotation if browser fails

#### Bot Detection Bypass Techniques
- **Advanced Stealth**: 
  - `playwright-stealth` package for fingerprinting evasion
  - Custom JavaScript init scripts for canvas/WebGL protection
  - Hardware/device memory masking
  - Plugin and language randomization
  - Timezone and viewport randomization
- **Human-like Behavior**:
  - Random delays between actions (1-3 seconds)
  - Realistic scrolling patterns
  - 15% chance to visit homepage between category scrapes
  - Non-headless browser mode
- **Proxy Management**:
  - Health tracking (success/failure rates)
  - Cooldown periods for failed proxies
  - Least-recently-used (LRU) rotation strategy
  - Automatic proxy rotation on detection

#### Current Challenges
- **PerimeterX Blocking**: Still encountering HTTP 412 (Precondition Failed) and 429 (Too Many Requests)
- **Data Extraction**: Category page navigation (`/cp/food/{category_id}`) needs refinement for data extraction
- **Rate Limiting**: Aggressive rate limiting requires longer delays and better proxy rotation

#### Notes & Limitations
- UPC only in PDP, not search results
- Aggressive bot detection - PerimeterX requires sophisticated bypass techniques
- Store context required for accurate pricing/availability
- `productLocation` may be `null` for items not in selected store
- Persisted queries use SHA256 hashes in URL
- Proxy support is required for production use
- Browser automation is necessary for reliable scraping

---

### Target

#### API Overview
- **Type**: REST (Redsky API)
- **Base URL**: `https://redsky.target.com/redsky_aggregations/v1/`
- **Authentication**: API Key required (`key` parameter)
- **Rate Limiting**: Unknown, recommend conservative rate

#### Endpoints

##### 1. Category/Search
- **URL Pattern**: `GET https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2`
- **Method**: GET
- **Key Parameters**:
  - `key`: API key (required)
  - `keyword`: Search query
  - `category`: Category ID
  - `store_id`: Store identifier
  - `visitor_id`: Session identifier
  - `channel`: `WEB`
  - `pricing_store_id`: For store-specific pricing
- **Response Format**: JSON

##### 2. Product Detail (PDP)
- **URL Pattern**: `GET https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1`
- **Method**: GET
- **Key Parameters**:
  - `key`: API key
  - `tcin`: Target item ID
  - `store_id`: Store identifier
  - `pricing_store_id`: Store for pricing
- **Response Format**: JSON

##### 3. Fulfillment/Aisle Location
- **URL Pattern**: `GET https://redsky.target.com/redsky_aggregations/v1/web/product_fulfillment_and_variation_hierarchy_v1`
- **Method**: GET
- **Key Parameters**:
  - `key`: API key
  - `tcin`: Target item ID
  - `store_id`: Store identifier (critical for aisle data)
  - `required_store_id`: Same as store_id
  - `latitude`, `longitude`: Location coordinates
  - `zip`: ZIP code
- **Response Format**: JSON

#### Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `tcin` | `external_id` | Target item ID |
| `primary_barcode` | `barcode` | 12-digit UPC (PDP only) |
| `dpci` | `dpci` | Target department code |
| `product_description.title` | `name` | Product name |
| `primary_brand.name` | `brand` | Brand name |
| `price.current_retail` | `cost_price` | Current price |
| `price.reg_retail` | `list_price` | Regular price |
| `price.formatted_unit_price` | `price_per_unit` | e.g., "$0.12" |
| `price.formatted_unit_price_suffix` | `price_per_unit_uom` | e.g., "/oz" |
| `enrichment.images.primary_image_url`, `enrichment.images.alternate_image_urls[]` | `image_urls` | Product images (up to 10, array: primary + alternates) |
| `store_positions[].aisle` | `store_aisle` | Aisle number |
| `store_positions[].block` | `store_block` | Store section |
| `ratings_and_reviews.statistics.rating.average` | `rating` | Customer rating |
| `ratings_and_reviews.statistics.review_count` | `review_count` | Number of reviews |

#### Barcode Strategy
- **Format**: UPC-12
- **Availability**: PDP response only
- **Extraction Method**: Direct field access
- **Field Path**: `data.product.item.primary_barcode`

#### In-Store Location
- **Availability**: Yes, via fulfillment API
- **Field Path**: `data.product_fulfillment.store_options[].store_positions[]`
- **Format**: Structured with aisle number and block
- **Structure**:
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
- **Notes**: Requires fulfillment API call with valid `store_id`. Location is highly store-specific.

#### Python Extraction Example

```python
def extract_target_product(item: dict) -> dict:
    """Extract product data from Target PDP response."""
    price = item.get('price', {})
    product = item.get('product', {})
    enrichment = item.get('enrichment', {})
    images_data = enrichment.get('images', {})
    
    # Extract images (up to 10): primary + alternates
    image_urls = []
    primary_image = images_data.get('primary_image_url')
    if primary_image:
        image_urls.append(primary_image)
    
    # Add alternate images
    alternate_urls = images_data.get('alternate_image_urls', [])
    for alt_url in alternate_urls[:9]:  # Limit to 10 total (1 primary + 9 alternates)
        if alt_url and alt_url not in image_urls:
            image_urls.append(alt_url)
    
    return {
        'external_id': item.get('tcin'),
        'barcode': item.get('primary_barcode'),
        'dpci': item.get('dpci'),
        'name': item.get('product_description', {}).get('title'),
        'brand': item.get('primary_brand', {}).get('name'),
        'cost_price': price.get('current_retail'),
        'list_price': price.get('reg_retail'),
        'price_per_unit': price.get('formatted_unit_price'),
        'price_per_unit_uom': price.get('formatted_unit_price_suffix'),
        'image_urls': image_urls[:10],  # Limit to 10 images
        'category': product.get('category', {}).get('name'),
        'is_fresh': item.get('is_fresh_grocery', False),
    }

def extract_target_location(fulfillment_data: dict) -> dict:
    """Extract aisle location from Target fulfillment API."""
    store_options = fulfillment_data.get('data', {}).get('product_fulfillment', {}).get('store_options', [])
    
    for option in store_options:
        positions = option.get('store_positions', [])
        if positions:
            pos = positions[0]
            return {
                'store_aisle': pos.get('aisle'),
                'store_block': pos.get('block'),
                'store_floor': pos.get('floor'),
            }
    return {}
```

#### Implementation Status
- **Status**: ✅ Production Ready
- **Scraper Location**: `scrapers/target_scraper.py`
- **Last Scrape**: November 30, 2025
- **Products Scraped**: 27,681 products from Austin North store (ID: 95)
- **UPC Coverage**: 22,874 products (82.6%)
- **Aisle Location Coverage**: 7,190 products (26.0%)

#### Scraping Method
1. **Category Discovery**: Uses nested category structure with `node_id` values from complete hierarchy
2. **Product Listing**: Fetches products via `plp_search_v2` endpoint with pagination
3. **Batch Processing**: Uses `ThreadPoolExecutor` (5 workers) to parallelize PDP and fulfillment API calls
4. **UPC Extraction**: Fetched via PDP endpoint (`pdp_client_v1`) for each product
5. **Image Collection**: Extracts up to 10 images (primary + alternate_image_urls) from PDP response
6. **Aisle Location**: Fetched via fulfillment endpoint (`product_fulfillment_and_variation_hierarchy_v1`) per product
7. **Data Storage**: 
   - Saves to `target_products.json` (JSON file)
   - Upserts directly to Supabase during scraping (if not in dry-run mode)
   - Uses `on_conflict='upc'` strategy for products table
   - **Image Storage Logic**: Images are only stored in `product_images` table on first scrape when UPC is encountered. If images already exist for a product, they are not overwritten.

#### Product Filtering
- **Online-Only Products**: Products with `in_store_only.availability_status == "NOT_SOLD_IN_STORE"` are filtered out
- **Fulfillment API 404s**: Products that return 404 from fulfillment API are considered unavailable and excluded
- **Aisle Location**: Only products with physical store locations have aisle data (26% coverage is expected - many products are online-only)

#### Notes & Limitations
- UPC only in PDP (`primary_barcode` field)
- Aisle location requires separate fulfillment API call
- API key required for all requests
- Store context critical for pricing and availability
- DPCI is Target's internal department/class/item code
- Many products are online-only and don't have aisle locations
- Fulfillment API may return 404 for discontinued or unavailable products

---

### Costco

#### API Overview
- **Type**: REST
- **Base URL**: `https://www.costco.com/`
- **Authentication**: Membership-based (cookies)
- **Rate Limiting**: Strict bot detection

#### Endpoints

##### 1. Category/Search
- **URL Pattern**: `GET https://www.costco.com/CatalogSearch`
- **Method**: GET
- **Key Parameters**:
  - `keyword`: Search query
  - `dept`: Department filter
  - `pageSize`: Results per page
  - `currentPage`: Page number
- **Response Format**: HTML with embedded JSON

##### 2. Product Detail (PDP)
- **URL Pattern**: `GET https://www.costco.com/[product-slug].product.[item_id].html`
- **Method**: GET
- **Key Parameters**:
  - `item_id`: Costco item ID (in URL)
- **Response Format**: HTML with embedded JSON (`__NEXT_DATA__` or inline scripts)

#### Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `itemNumber` | `external_id` | Costco item number |
| `item_manufacturing_skus` | `barcode` | GTIN-14, convert to UPC-12 |
| `productName` | `name` | Product name |
| `brand` | `brand` | Brand name |
| `priceTotal` | `cost_price` | Current price |
| `originalPrice` | `list_price` | Regular price |
| `unitPriceAmount` | `price_per_unit` | Price per unit |
| `unitPriceUom` | `price_per_unit_uom` | oz, lb, ct, etc. |
| `productImageUrl`, `productImages[]` | `image_urls` | Product images (up to 10, array) |
| `averageOverallRating` | `rating` | Customer rating |
| `totalReviewCount` | `review_count` | Number of reviews |

#### Barcode Strategy
- **Format**: GTIN-14 (stored), converts to UPC-12
- **Availability**: PDP response only
- **Extraction Method**: Parse `item_manufacturing_skus`, strip first 2 digits
- **Field Path**: `item_manufacturing_skus` array

**GTIN-14 to UPC-12 Conversion:**
```
GTIN-14:  10012345678905
          ^^            
          Packaging indicator (strip these)
          
UPC-12:     012345678905
```

#### In-Store Location
- **Availability**: No (warehouse format varies)
- **Notes**: Costco warehouses don't have fixed aisle assignments like traditional grocery stores

#### Python Extraction Example

```python
def gtin14_to_upc12(gtin14: str) -> str:
    """Convert GTIN-14 to UPC-12 by stripping first 2 digits."""
    if len(gtin14) == 14:
        return gtin14[2:]  # Remove packaging indicator
    return gtin14

def extract_costco_product(data: dict) -> dict:
    """Extract product data from Costco PDP response."""
    # Get UPC from manufacturing SKUs
    mfg_skus = data.get('item_manufacturing_skus', [])
    barcode = None
    if mfg_skus:
        gtin = mfg_skus[0] if isinstance(mfg_skus[0], str) else mfg_skus[0].get('value')
        if gtin:
            barcode = gtin14_to_upc12(gtin)
    
    # Extract images (up to 10)
    image_urls = []
    primary_image = data.get('productImageUrl')
    if primary_image:
        image_urls.append(primary_image)
    
    # Add additional images if available
    product_images = data.get('productImages', [])
    for img in product_images[:9]:  # Limit to 10 total
        img_url = img.get('url') if isinstance(img, dict) else img
        if img_url and img_url not in image_urls:
            image_urls.append(img_url)
    
    return {
        'external_id': data.get('itemNumber'),
        'barcode': barcode,
        'name': data.get('productName'),
        'brand': data.get('brand'),
        'cost_price': data.get('priceTotal'),
        'list_price': data.get('originalPrice'),
        'price_per_unit': data.get('unitPriceAmount'),
        'price_per_unit_uom': data.get('unitPriceUom'),
        'image_urls': image_urls[:10],  # Limit to 10 images
        'rating': data.get('averageOverallRating'),
        'review_count': data.get('totalReviewCount'),
    }
```

#### Implementation Status
- **Status**: ✅ Production Ready
- **Scraper Location**: `scrapers/costco_scraper.py`
- **Last Scrape**: November 22, 2025
- **Location Scraped**: 681-wh (Austin, TX)
- **Products Scraped**: 424 items imported from 648 items found
- **Categories Processed**: 18 categories
- **Pages Processed**: 37 pages

#### Scraping Method
1. **Category Discovery**: Discovers grocery categories and subcategories from Costco's Fusion API
2. **Pagination**: Handles pagination automatically (24 items per page default)
3. **Location-Specific**: Scrapes inventory for specific warehouse locations (e.g., "681-wh")
4. **Image Collection**: Extracts up to 10 images (primary + productImages array) from product data
5. **Product Storage**: 
   - Uses `CostcoFusionAPIImporter` for location-specific storage
   - Stores products directly to Supabase during scraping
   - Creates `product_store_mappings` entries with location-specific store names (e.g., "costco-681-wh")
   - Creates `product_pricing` entries with current prices
   - Deactivates items no longer in inventory
   - **Image Storage Logic**: Images are only stored in `product_images` table on first scrape when UPC is encountered. If images already exist for a product, they are not overwritten.
6. **UPC Extraction**: Converts GTIN-14 from `item_manufacturing_skus` to UPC-12
7. **Filtering**: Filters for InWarehouse items only

#### Bulk Item Relationships

Costco sells bulk/multi-pack items that correspond to individual SKUs at other retailers:

| Costco Item | Individual SKU | Relationship |
|-------------|----------------|--------------|
| 24-pack water bottles | Single water bottle | 24:1 |
| 3-pack olive oil | Single bottle | 3:1 |

**Strategy:**
1. Attempt automated matching via UPC relationships (GTIN-14 packaging codes)
2. Fall back to manual mapping in selling configuration
3. Store `pack_quantity` field for bulk items

#### Notes & Limitations
- UPC available via GTIN-14 in `item_manufacturing_skus`
- Requires membership cookie for full access
- Aggressive bot detection
- No aisle location (warehouse format)
- Bulk items need special handling for SKU relationships

---

### Central Market

#### API Overview
- **Type**: GraphQL (HEB backend)
- **Base URL**: `https://www.centralmarket.com/_next/data/`
- **Authentication**: None required
- **Rate Limiting**: Same as HEB

#### Endpoints

##### 1. Category/Search
- **URL Pattern**: `GET https://www.centralmarket.com/_next/data/{build_id}/search.json?q={query}`
- **Method**: GET
- **Key Parameters**:
  - `build_id`: Next.js build ID (changes on deploy)
  - `q`: Search query
  - `storeId`: Store identifier
- **Response Format**: JSON (Next.js Data API)

##### 2. Product Detail (PDP)
- **URL Pattern**: `GET https://www.centralmarket.com/_next/data/{build_id}/product/{product_id}.json`
- **Method**: GET
- **Key Parameters**:
  - `build_id`: Next.js build ID
  - `product_id`: Product identifier
- **Response Format**: JSON (Next.js Data API)

#### Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `productId` | `external_id` | Central Market product ID |
| `sku` | `barcode` | UPC (extracted during cart flow) |
| `description` | `name` | Product name |
| `brand.name` | `brand` | Brand name |
| `currentPrice.amount` | `cost_price` | Current price |
| `originalPrice.amount` | `list_price` | Regular price |
| `unitListPrice.amount` | `price_per_unit` | Price per unit |
| `unitListPrice.unit` | `price_per_unit_uom` | Unit of measure |
| `image.url`, `images[]` | `image_urls` | Product images (up to 10, array) |
| `aisle_location` | `store_location` | Aisle info |
| `category.name` | `category` | Category name |

#### Barcode Strategy
- **Format**: UPC-12
- **Availability**: PDP response and cart extraction
- **Extraction Method**: Direct field access (same as HEB)
- **Field Path**: `pageProps.product.sku` or cart data

#### In-Store Location
- **Availability**: Yes, store-specific
- **Field Path**: Same as HEB
- **Format**: Free text
- **Notes**: Central Market uses HEB's backend infrastructure

#### Python Extraction Example

```python
def extract_central_market_product(data: dict) -> dict:
    """Extract product data from Central Market Next.js response."""
    page_props = data.get('pageProps', {})
    product = page_props.get('product', {})
    
    # Extract images (up to 10)
    image_urls = []
    primary_image = product.get('image', {}).get('url')
    if primary_image:
        image_urls.append(primary_image)
    
    # Add additional images if available
    additional_images = product.get('images', [])
    for img in additional_images[:9]:  # Limit to 10 total
        img_url = img.get('url') if isinstance(img, dict) else img
        if img_url and img_url not in image_urls:
            image_urls.append(img_url)
    
    return {
        'external_id': product.get('productId'),
        'barcode': product.get('sku'),
        'name': product.get('description'),
        'brand': product.get('brand', {}).get('name'),
        'cost_price': product.get('currentPrice', {}).get('amount'),
        'list_price': product.get('originalPrice', {}).get('amount'),
        'price_per_unit': product.get('unitListPrice', {}).get('amount'),
        'price_per_unit_uom': product.get('unitListPrice', {}).get('unit'),
        'image_urls': image_urls[:10],  # Limit to 10 images
        'store_location': product.get('aisle_location'),
        'category': product.get('category', {}).get('name'),
    }
```

#### Implementation Status
- **Status**: ✅ Production Ready - Import Complete
- **Scraper Location**: `scrapers/central_market/run_scrape.py`
- **Import Script**: `scripts/imports/import_central_market_products.py`
- **Last Import**: November 30, 2025
- **Products Processed**: 24,575 products
- **New Products Created**: 20,276
- **Matched by UPC**: 4,298 (merged with existing products)
- **Products Updated**: 1,556 (category/subcategory data added)
- **Uncategorized**: 8,409 (needs manual review)

#### Scraping Method
1. **Category Discovery**: Uses Central Market's category hierarchy with category IDs
2. **Product Listing**: Fetches products via Next.js Data API (`/_next/data/{build_id}/search.json`)
3. **PDP Extraction**: Fetches full product details including UPC from PDP endpoint
4. **Image Collection**: Extracts up to 10 images (primary + additional images array) from product data
5. **Data Storage**: 
   - Saves to `cm_products.json` (JSON file) during scraping
   - Separate import script processes JSON and upserts to Supabase
   - Uses `on_conflict='upc'` strategy for product matching
   - **Image Storage Logic**: Images are only stored in `product_images` table on first scrape when UPC is encountered. If images already exist for a product, they are not overwritten.

#### Import Process
1. **JSON to Supabase**: Import script reads `cm_products.json` and processes in batches (100 products)
2. **UPC Matching**: Existing products matched by UPC are merged (not duplicated)
3. **Category Updates**: Products without categories get category data from Central Market
4. **Store Mappings**: Creates `product_store_mappings` entries for Central Market store
5. **Pricing Records**: Creates `product_pricing` entries with current prices

#### Category Structure

Central Market has a well-defined category hierarchy:

```
Fruits & Vegetables (483475)
├── Fruit (483627)
└── Vegetables (483718)

Meat & Poultry (1246473)
├── In-House Sausage (1246474)
├── Meat (1246475)
├── Poultry (1246491)
└── ...

Dairy & Eggs (483468)
├── Eggs (483544)
├── Milk & Cream (483545)
└── ...
```

#### Notes & Limitations
- Uses HEB backend infrastructure
- Next.js Data API requires tracking `build_id` (changes on deploy)
- Avoid `purpose: prefetch` header (returns empty response)
- Store-specific pricing and availability
- Premium/specialty items not available at HEB
- Import process separates scraping from database insertion for reliability

---

### Whole Foods

#### API Overview
- **Type**: HTML with embedded `__NEXT_DATA__` JSON (Next.js)
- **Base URL**: `https://www.wholefoodsmarket.com/`
- **Authentication**: None required for basic data; Amazon account for aisle locations
- **Rate Limiting**: Standard bot detection, recommend 1.5-2 seconds between requests
- **Store-Specific Pricing**: **CRITICAL** - Must include `?store={store_id}` parameter to get pricing data

#### Key Discovery: Store Parameter Required for Pricing

**Without `?store=` parameter:**
- Category pages return: `name`, `slug`, `brand`, `imageThumbnail`, `store`
- **NO PRICING DATA**

**With `?store=10225` parameter:**
- Category pages return: `name`, `slug`, `brand`, `imageThumbnail`, `store`, **`regularPrice`**, **`salePrice`**, `incrementalSalePrice`, `saleStartDate`, `saleEndDate`, `isLocal`

**Always include the store parameter in all requests!**

#### Endpoints

##### 1. Category Page (Product Discovery)
- **URL Pattern**: `GET https://www.wholefoodsmarket.com/products/{category}?store={store_id}`
- **Method**: GET
- **Key Parameters**:
  - `store`: Store ID (required for pricing!) e.g., `10225` for Third & Fairfax, LA
  - `page`: Page number for pagination (optional)
- **Response Format**: HTML with embedded `__NEXT_DATA__` JSON
- **Data Location**: `props.pageProps.data.results[]`
- **Products Per Page**: ~60

**Category Page Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Product name |
| `slug` | string | URL slug containing ASIN (e.g., `produce-organic-cucumbers-b07dlgkrtd`) |
| `brand` | string | Brand name (e.g., "PRODUCE", "365 by Whole Foods Market") |
| `imageThumbnail` | string | Product image URL |
| `store` | number | Store ID |
| `regularPrice` | number | Regular price (requires `?store=` param) |
| `salePrice` | number/null | Sale price if on sale (requires `?store=` param) |
| `incrementalSalePrice` | number/null | Bulk discount price |
| `saleStartDate` | string | Sale start date (ISO 8601) |
| `saleEndDate` | string | Sale end date (ISO 8601) |
| `isLocal` | boolean | Local product flag |

##### 2. Product Detail Page (PDP) - Enrichment
- **URL Pattern**: `GET https://www.wholefoodsmarket.com/product/{slug}?store={store_id}`
- **Method**: GET
- **Key Parameters**:
  - `store`: Store ID (required for pricing!)
- **Response Format**: HTML with embedded `__NEXT_DATA__` JSON
- **Data Location**: `props.pageProps.data`

**PDP-Only Fields (not in category):**
| Field | Type | Description |
|-------|------|-------------|
| `asin` | string | Amazon ASIN (e.g., "B07DLGKRTD") |
| `id` | string | Internal Whole Foods product ID |
| `categories` | object | Nested category hierarchy |
| `brand` | object | `{name, slug}` - more detailed than category page |
| `diets` | array | Diet tags: Gluten-Free, Vegan, Dairy-Free, etc. |
| `ingredients` | array | Ingredients list |
| `nutritionElements` | array | 33 nutrition facts (calories, fat, etc.) |
| `servingInfo` | object | Size/weight info (totalSize, totalSizeUom) |
| `certifications` | array | Organic, Non-GMO, etc. |
| `images` | array | Multiple image sizes (thumbnail, image, image2x) |
| `isAvailable` | boolean | Availability status |
| `isAlcoholic` | boolean | Alcohol flag |
| `related` | array | Related products |

#### ASIN Extraction from Slug

ASINs are embedded in the product slug, not directly available on category pages:

```python
def extract_asin_from_slug(slug: str) -> Optional[str]:
    """Extract ASIN from Whole Foods product slug.
    
    Example: 'produce-organic-english-cucumbers-b07dlgkrtd' → 'B07DLGKRTD'
    """
    if not slug:
        return None
    
    parts = slug.split('-')
    if parts:
        potential_asin = parts[-1].upper()
        # ASINs are 10 chars, start with B0
        if len(potential_asin) == 10 and potential_asin.startswith('B0'):
            return potential_asin
    
    return None
```

#### Field Mapping

| API Field | Goods Schema Field | Source | Notes |
|-----------|-------------------|--------|-------|
| (from slug) | `external_id` | Category | ASIN extracted from slug |
| `asin` | `external_id` | PDP | Direct ASIN field |
| (via RocketSource) | `barcode` | API | ASIN-to-UPC conversion |
| `name` | `name` | Both | Product name |
| (generated) | `handle` | Computed | Lowercase, hyphenated slug |
| `brand` | `brand` | Both | Brand name |
| `regularPrice` | `list_price` | Both | Regular price (needs `?store=`) |
| `salePrice` | `sale_price` | Both | Sale price (needs `?store=`) |
| `salePrice` or `regularPrice` | `cost_price` | Both | Effective price |
| `saleStartDate`, `saleEndDate` | `pricing_metadata` | Both | Sale dates |
| `servingInfo.totalSize` | `size` | PDP | Package size |
| `servingInfo.totalSizeUom` | `size_uom` | PDP | Unit of measure |
| `imageThumbnail` | `image_url` | Category | Single thumbnail |
| `images[]` | `image_urls` | PDP | Multiple sizes (up to 10) |
| `categories` | `category_id`, `subcategory_id` | PDP | Nested hierarchy |
| `diets[]` | `metadata.diets` | PDP | Diet tags |
| `ingredients[]` | `metadata.ingredients` | PDP | Ingredients list |
| `nutritionElements[]` | `metadata.nutrition` | PDP | 33 nutrition facts |
| `isAvailable` | `is_active` | PDP | Availability |
| `isLocal` | `metadata.is_local` | Both | Local product |

#### Barcode Strategy
- **Format**: UPC-12 (via ASIN lookup)
- **Availability**: Requires external API conversion
- **Extraction Method**: RocketSource ASIN-to-UPC API
- **Primary Identifier**: ASIN (Amazon Standard Identification Number)

**ASIN-to-UPC Workflow:**
```
1. Scrape product → Get ASIN (e.g., "B07DLGKRTD")
2. Batch collect ASINs (up to 1000 per request)
3. Call RocketSource API → Get UPCs
4. Store both ASIN (external_id) and UPC (barcode)
```

#### RocketSource API Integration

**Endpoint:** `POST https://app.rocketsource.io/api/v3/asin-convert`

**Request:**
```json
{
  "marketplace": "US",
  "asins": ["B07DLGKRTD", "B078J118FH", "B004DAQPR0"]
}
```

**Response:**
```json
{
  "B07DLGKRTD": {
    "upc": ["012345678901"],
    "ean": ["0012345678901"]
  },
  "B078J118FH": {
    "upc": ["098765432109"],
    "ean": ["0098765432109"]
  }
}
```

**Python Integration:**
```python
class RocketSourceClient:
    BASE_URL = "https://app.rocketsource.io"
    
    def __init__(self, api_token: str):
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
        })
        self._cache: Dict[str, Optional[str]] = {}
    
    def convert_asins(self, asins: List[str]) -> Dict[str, Optional[str]]:
        """Batch convert ASINs to UPCs (max 1000 per request)."""
        results = {}
        
        # Filter already cached
        uncached = [a for a in asins if a not in self._cache]
        
        if uncached:
            response = self.session.post(
                f'{self.BASE_URL}/api/v3/asin-convert',
                json={'marketplace': 'US', 'asins': uncached[:1000]}
            )
            response.raise_for_status()
            data = response.json()
            
            for asin in uncached:
                upc_list = data.get(asin, {}).get('upc', [])
                upc = upc_list[0] if upc_list else None
                self._cache[asin] = upc
        
        return {a: self._cache.get(a) for a in asins}
```

#### Efficient Barcode Conversion Strategy

**Credit-Optimized Approach:**
Instead of converting ASINs during scraping, the scraper uses a single efficient batch conversion at the end:

```python
def _convert_missing_barcodes(self) -> None:
    """Convert ASINs to UPCs for products missing barcodes.
    
    This is credit-efficient:
    - Queries DB for Whole Foods products without barcodes
    - Batches up to 1000 ASINs per API call
    - Skips products that already have barcodes
    """
    # Query database for products missing barcodes
    result = self.supabase_client.table('source_products').select(
        'external_id'
    ).is_('barcode', 'null').like('external_id', 'B%').limit(1000).execute()
    
    asins = [row['external_id'] for row in result.data if row.get('external_id')]
    
    if not asins:
        return
    
    # Convert ASINs to UPCs (RocketSource batches internally up to 1000)
    upc_results = self.rocketsource.convert_asins(asins)
    
    # Update database records with barcodes
    for asin, upc in upc_results.items():
        if upc:
            self.supabase_client.table('source_products').update({
                'barcode': upc
            }).eq('external_id', asin).execute()
```

**Benefits:**
- **Single API call**: 1 RocketSource API call total (vs N calls during scraping)
- **Skips existing**: Only converts products missing barcodes
- **Batch efficient**: Up to 1000 ASINs per request
- **Database-driven**: Queries actual database state, not in-memory tracking

#### In-Store Location
- **Availability**: Yes, but requires Amazon authentication
- **Notes**: Must be logged in with Amazon account and store selected
- **Not implemented**: Location data not currently scraped

#### Category Hierarchy

PDP pages include nested category structure:

```json
{
  "categories": {
    "name": "Produce",
    "slug": "produce",
    "childCategory": {
      "name": "Fresh Vegetables",
      "slug": "fresh-vegetables"
    }
  }
}
```

**Category Mapping:**
```python
WHOLEFOODS_CATEGORY_MAP = {
    'produce': ('Fruit & vegetables', None),
    'dairy-cheese-eggs': ('Dairy & eggs', None),
    'bread-bakery': ('Bakery & bread', None),
    'meat-seafood': ('Meat & seafood', None),
    'frozen-foods': ('Frozen food', None),
    'beverages': ('Beverages', None),
    'pantry-essentials': ('Pantry', None),
    'snacks-chips-salsas-dips': ('Pantry', 'Snacks & candy'),
    'vitamins-supplements': ('Health & beauty', 'Vitamins & supplements'),
    'beauty': ('Health & beauty', None),
    'household': ('Everyday essentials', None),
}
```

#### Two-Phase Scraping Strategy

**Phase 1: Product Discovery (Category Pages)**
- Fetch category pages with `?store={store_id}` for pricing
- Extract products from `pageProps.data.results[]`
- Get: name, slug (→ASIN), brand, prices, image
- ~60 products per page, fast pagination

**Phase 2: PDP Enrichment (Optional)**
- For each product, fetch PDP for full details
- Get: categories, ingredients, nutrition, size, multiple images
- Rate limited: ~2 seconds between requests
- **Note**: PDP requests can be slow (15-30s timeout recommended)

**When to Skip PDP:**
- Basic product catalog: Category data sufficient
- Price monitoring only: Category has all pricing

**When PDP is Needed:**
- Full nutrition data required
- Ingredients list needed
- Category hierarchy mapping
- Multiple image sizes

#### Python Extraction Example

```python
from bs4 import BeautifulSoup
import json
import re

class WholeFoodsHTMLClient:
    DEFAULT_STORE_ID = "10225"  # Third & Fairfax, LA
    
    def __init__(self, store_id: str = None):
        self.store_id = store_id or self.DEFAULT_STORE_ID
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
        })
    
    def fetch_category_page(self, category_slug: str, page: int = 1) -> Optional[str]:
        """Fetch category page with store-specific pricing."""
        url = f"https://www.wholefoodsmarket.com/products/{category_slug}"
        params = {'store': self.store_id}
        if page > 1:
            params['page'] = page
        
        response = self.session.get(url, params=params, timeout=15)
        response.raise_for_status()
        return response.text
    
    def parse_next_data(self, html: str) -> Optional[dict]:
        """Extract __NEXT_DATA__ JSON from HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        if script and script.string:
            return json.loads(script.string)
        return None
    
    def extract_products_from_category(self, html: str) -> List[dict]:
        """Extract products from category page."""
        next_data = self.parse_next_data(html)
        if not next_data:
            return []
        
        results = next_data.get('props', {}).get('pageProps', {}).get('data', {}).get('results', [])
        products = []
        
        for item in results:
            slug = item.get('slug', '')
            asin = self.extract_asin_from_slug(slug)
            
            if not asin:
                continue
            
            products.append({
                'asin': asin,
                'slug': slug,
                'name': item.get('name', ''),
                'brand': item.get('brand', ''),
                'image_url': item.get('imageThumbnail', ''),
                'regular_price': item.get('regularPrice'),
                'sale_price': item.get('salePrice'),
                'is_on_sale': item.get('salePrice') is not None,
                'sale_start_date': item.get('saleStartDate'),
                'sale_end_date': item.get('saleEndDate'),
                'is_local': item.get('isLocal', False),
                'store_id': item.get('store'),
            })
        
        return products
    
    @staticmethod
    def extract_asin_from_slug(slug: str) -> Optional[str]:
        """Extract ASIN from product slug using regex pattern.
        
        Example: 'produce-organic-english-cucumbers-b07dlgkrtd' → 'B07DLGKRTD'
        """
        if not slug:
            return None
        # ASIN pattern: B followed by 9 alphanumeric characters at end of slug
        asin_match = re.search(r'-([B][0-9A-Z]{9})$', slug)
        return asin_match.group(1) if asin_match else None
    
    def fetch_pdp_page(self, product_slug: str) -> Optional[str]:
        """Fetch PDP page with store-specific pricing.
        
        Uses simplified headers (not session) to avoid rate limiting.
        """
        url = f"https://www.wholefoodsmarket.com/product/{product_slug}"
        params = {'store': self.store_id}
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=8)
        response.raise_for_status()
        return response.text
    
    def extract_pdp_data(self, html: str) -> Optional[dict]:
        """Extract full product data from PDP page."""
        next_data = self.parse_next_data(html)
        if not next_data:
            return None
        
        # PDP data is directly under pageProps.data
        page_props = next_data.get('props', {}).get('pageProps', {})
        product_data = page_props.get('data', {})
        
        return product_data  # Contains: categories, ingredients, nutrition, servingInfo, etc.
```

#### Implementation Status
- **Status**: ✅ Production Ready
- **Scraper Location**: `scrapers/whole_foods_scraper.py`
- **Last Scrape**: December 9, 2025
- **Store Used**: 10225 (Third & Fairfax, Los Angeles)
- **Performance**: ~3-4 seconds per product (category + PDP + storage)

#### Scraping Method
1. **Store Selection**: Use `?store={store_id}` parameter on ALL requests for pricing (mandatory)
2. **Category Discovery**: Systematically scrapes 12 grocery categories:
   - Produce, Dairy, Breads, Deli, Frozen, Meat, Snacks, Pantry, Beverages, Beauty, Household, Vitamins
3. **Systematic Category Scraping**:
   - Iterates through all 12 categories sequentially
   - Paginates through each category (up to 100 pages, stops after 2 consecutive empty pages)
   - ~60 products per page
4. **Two-Phase Scraping**:
   - **Phase 1: Category Pages** - Fast product discovery with pricing
     - Extracts: ASIN (from slug), name, brand, `regularPrice`, `salePrice`, `imageThumbnail`
     - Uses `__NEXT_DATA__` JSON embedded in HTML
   - **Phase 2: PDP Enrichment** - Full product details
     - Fetches PDP for each product to get: categories, nutrition, ingredients, `servingInfo`, multiple images
     - Uses simplified headers (not session) to avoid rate limiting
     - 8-second timeout per PDP request
5. **ASIN Extraction**: Parse ASIN from product slug using regex pattern `-([B][0-9A-Z]{9})$`
6. **Efficient UPC Conversion** (Credit-Optimized):
   - **Single batch at end**: Queries database for all Whole Foods products missing barcodes
   - **Skips existing barcodes**: Only converts ASINs where `barcode IS NULL`
   - **Batch API calls**: RocketSource supports up to 1000 ASINs per request
   - **Database update**: Updates `source_products.barcode` after conversion
   - **Credit efficient**: 1 API call total instead of N calls during scraping
7. **Product Storage**:
   - Creates/updates `source_products` with: name, brand, handle, external_id (ASIN), barcode (UPC), size, size_uom, description, product_page_url, metadata, full_category_hierarchy
   - Creates `product_store_mappings` with `store_name='whole_foods'` and `store_item_id=ASIN`
   - Creates `product_pricing` with: `price` (effective price), `list_price` (regularPrice), `sale_price` (salePrice), `is_on_sale`, `location_id` (store ID)
   - Stores images in `image` table (up to 10 images per product)
8. **Handle Generation**: Generated from product name (lowercase, hyphenated, special chars removed)
9. **Category Mapping**: Uses PDP `categories` hierarchy to map to Goods taxonomy via `WHOLEFOODS_CATEGORY_MAP`

#### Default Store IDs

| Store ID | Location | Notes |
|----------|----------|-------|
| `10225` | Third & Fairfax, Los Angeles | Default store |
| `10001` | Columbus Circle, NYC | - |
| `10420` | Austin, TX | - |

#### Complete Scraping Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHOLE FOODS SCRAPING FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SYSTEMATIC CATEGORY ITERATION                               │
│     For each of 12 categories (Produce, Dairy, Breads, etc.):  │
│                                                                 │
│  2. CATEGORY PAGE SCRAPING (with ?store= for pricing!)          │
│     GET /products/{category}?store=10225&page={n}              │
│     └── Extract from __NEXT_DATA__.props.pageProps.data.results│
│     └── Get: ASIN (from slug), name, brand, regularPrice,       │
│         salePrice, imageThumbnail                                │
│     └── ~60 products per page, paginate until empty             │
│                                                                 │
│  3. PDP ENRICHMENT (for each product)                            │
│     GET /product/{slug}?store=10225                             │
│     └── Extract from __NEXT_DATA__.props.pageProps.data        │
│     └── Get: categories, nutrition, ingredients, servingInfo,  │
│         multiple images                                          │
│     └── Simplified headers (not session) to avoid rate limits  │
│                                                                 │
│  4. PRODUCT STORAGE                                              │
│     └── source_products: external_id=ASIN, name, brand, handle, │
│         size, size_uom, description, metadata                   │
│     └── product_store_mappings: store_name='whole_foods',       │
│         store_item_id=ASIN                                       │
│     └── product_pricing: price, list_price, sale_price,         │
│         is_on_sale, location_id=store_id                         │
│     └── image: Up to 10 images per product                       │
│                                                                 │
│  5. EFFICIENT UPC CONVERSION (single batch at end)              │
│     └── Query DB: SELECT external_id FROM source_products      │
│         WHERE barcode IS NULL AND external_id LIKE 'B%'         │
│     └── POST app.rocketsource.io/api/v3/asin-convert            │
│         (batch up to 1000 ASINs → UPCs)                          │
│     └── UPDATE source_products SET barcode=UPC                   │
│     └── Credit efficient: 1 API call total                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Notes & Limitations
- **Store parameter required**: Without `?store=`, no pricing data is returned on category pages
- **No native UPC**: Requires ASIN-to-UPC lookup via RocketSource API
- **RocketSource API**: Requires API token (passed via `--rocketsource-token` or `ROCKETSOURCE_API_TOKEN` env var)
- **PDP requests**: Use simplified headers (not session) to avoid rate limiting; 8-second timeout
- **ASIN extraction**: Some product slugs don't contain ASINs (filtered out during extraction)
- **In-store location**: Requires Amazon authentication (not implemented)
- **Bot detection**: Standard Amazon infrastructure, use browser-like headers
- **Categories from PDP only**: Category hierarchy not in category page response, requires PDP fetch
- **Rate limiting**: 1.5-2 seconds between requests recommended
- **Pagination**: Stops after 2 consecutive empty pages to avoid infinite loops
- **Barcode conversion**: Efficient single-batch conversion at end of scrape (queries DB for missing barcodes)
- **Full scrape**: Systematically goes through all 12 categories with pagination until complete

---

### Trader Joe's

#### API Overview
- **Type**: GraphQL
- **Base URL**: `https://www.traderjoes.com/api/graphql`
- **Authentication**: Cookie-based session (recommended for bot protection bypass)
- **Rate Limiting**: Conservative rate recommended (1-2 seconds between requests)
- **Session Management**: Requires browser-like headers and cookies for reliable access

#### Endpoints

##### 1. All Products Discovery
- **URL Pattern**: `POST https://www.traderjoes.com/api/graphql`
- **Method**: POST
- **Operation**: `GetAllProducts`
- **Key Parameters**:
  - `currentPage`: Page number (1-based)
  - `pageSize`: Results per page (default: 24)
  - Filter: `availability: {match: "1"}`, `published: {eq: "1"}`
- **Response Format**: JSON (GraphQL)
- **Notes**: Returns all active products with pagination. Filters out products with price = 0.

##### 2. Product Detail (PDP) - Enrichment
- **URL Pattern**: `POST https://www.traderjoes.com/api/graphql`
- **Method**: POST
- **Operation**: `SearchProduct`
- **Key Parameters**:
  - `sku`: Product SKU (6-digit)
  - `published`: "1" (active products only)
- **Response Format**: JSON (GraphQL)
- **Notes**: Returns full product details including category hierarchy, marketing story, country of origin, and metadata.

#### Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `sku` | `external_id` | 6-digit TJ SKU |
| (computed) | `barcode` | EAN-8 from SKU |
| `item_title` | `name` | Product name |
| (computed) | `handle` | Generated from name (lowercase, hyphens) |
| `brand` | `brand` | Usually "Trader Joe's" (default) |
| `retail_price` | `cost_price` | Current price |
| `sales_size` | `size` | Package size (numeric string) |
| `sales_uom_description` | `size_uom` | Unit of measure (e.g., "Oz", "Lb", "Fl Oz") |
| `item_story_marketing` | `description` | Marketing story (HTML cleaned) |
| (computed) | `product_page_url` | Generated from item_title slug + SKU |
| `country_of_origin` | `origin_country` | Parsed country name (e.g., "Product of Turkey" → "Turkey") |
| `category_hierarchy[]` | `category_id`, `subcategory_id` | Mapped via TRADERJOES_CATEGORY_MAP |
| `category_hierarchy[]` | `full_category_hierarchy` | Full JSON array of category levels |
| (full PDP JSON) | `metadata` | Complete PDP response (JSONB) |
| `primary_image`, `other_images[]` | `image_urls` | Product images (up to 10, array) |
| (full product data) | `raw_data` | Complete product response for debugging |

#### Barcode Strategy
- **Format**: EAN-8 (computed from SKU)
- **Availability**: Computed, not in API response
- **Extraction Method**: Mathematical calculation from 6-digit SKU

**EAN-8 Pattern:**
```
EAN-8 = "0" + SKU (6 digits) + check digit
Example: SKU "086453" → EAN-8 "00864534"
```

**Check Digit Calculation:**
```python
def calculate_ean8_check_digit(digits_7: str) -> str:
    """
    Calculate EAN-8 check digit.
    Weights: 3,1,3,1,3,1,3 for positions 1-7
    """
    weights = [3, 1, 3, 1, 3, 1, 3]
    total = sum(int(d) * w for d, w in zip(digits_7, weights))
    check = (10 - (total % 10)) % 10
    return str(check)

def sku_to_ean8(sku: str) -> str:
    """Convert 6-digit TJ SKU to EAN-8 barcode."""
    sku_padded = sku.zfill(6)
    ean7 = "0" + sku_padded  # "0086453"
    check = calculate_ean8_check_digit(ean7)
    return ean7 + check  # "00864534"
```

**Verification:**
```
SKU: 086453
EAN-7: 0086453
Weights: 3,1,3,1,3,1,3
Calc: (0×3)+(0×1)+(8×3)+(6×1)+(4×3)+(5×1)+(3×3)
    = 0 + 0 + 24 + 6 + 12 + 5 + 9 = 56
Check: (10 - (56 % 10)) % 10 = (10 - 6) % 10 = 4
EAN-8: 00864534 ✓
```

#### Variable Weight Items (GS1 DataBar)

Fresh/deli items use GS1 DataBar format:
- **Prefix**: `0211`
- **Item Code**: First 5 digits of SKU
- **Check Digit**: Calculated
- **Price**: Embedded in barcode

```
GS1 DataBar: 0211 + 5-digit item + check + price
Not easily decoded without scale integration.
```

#### In-Store Location
- **Availability**: No
- **Notes**: Trader Joe's stores have unique layouts; no standardized aisle system

#### Two-Phase Scraping Strategy

The Trader Joe's scraper uses a two-phase approach to ensure complete product data:

**Phase 1: Product Discovery**
- Uses `GetAllProducts` operation to discover all active products
- Filters: `published: "1"` and `availability: {match: "1"}`
- Filters out products with `price = 0` (discontinued/unavailable)
- Returns basic product data: SKU, name, price, images
- Tracks all discovered SKUs for Phase 2

**Phase 2: PDP Enrichment**
- For each discovered product, makes a separate `SearchProduct` request
- Extracts full PDP data including:
  - Category hierarchy (for mapping to Goods categories)
  - Marketing story (`item_story_marketing` → `description`)
  - Country of origin (parsed to country name)
  - Full metadata (complete PDP JSON)
- Updates product record with enriched data

**Benefits:**
- Ensures all products have complete category mapping
- Captures marketing descriptions for product pages
- Stores full metadata for future data extraction
- Maintains data consistency across all products

#### Category Mapping

Trader Joe's provides a hierarchical category structure in PDP responses:

```
Level 1: "Products" (root)
Level 2: "Food", "Beverages" (broad categories)
Level 3: "Cheese", "Meat, Seafood & Plant-based", "Coffee & Tea" (parent for mapping)
Level 4: "Slices, Shreds, Crumbles", "Beef, Pork & Lamb" (subcategory for mapping)
```

**Mapping Strategy:**
- Uses `TRADERJOES_CATEGORY_MAP` in `scrapers/category_mapping.py`
- Maps TJ categories to actual Supabase category names (e.g., "Beverages", "Dairy & eggs")
- Level 3 category = parent category for mapping
- Level 4 category = subcategory for mapping (if available)
- Falls back to Level 3 with Level 2 as parent if no Level 4 exists

**Example Mapping:**
- TJ: "Beverages" > "Coffee & Tea" → Goods: "Beverages" > "Coffee"
- TJ: "Cheese" > "Slices, Shreds, Crumbles" → Goods: "Dairy & eggs" > "Cheese"
- TJ: "From The Freezer" > "Entrées & Sides" → Goods: "Frozen food" > "Meals & sides"

#### Product Page URL Generation

Product page URLs are generated from product name and SKU (NOT from `url_key` field):

**Format:** `https://www.traderjoes.com/home/products/pdp/{slug}-{sku}`

**Generation Process:**
1. Convert `item_title` to lowercase
2. Replace non-alphanumeric characters with hyphens
3. Collapse multiple hyphens to single hyphen
4. Append SKU: `{slug}-{sku}`

**Example:**
- Name: "Cold Brew Coffee Black", SKU: "080794"
- Slug: "cold-brew-coffee-black"
- URL: `https://www.traderjoes.com/home/products/pdp/cold-brew-coffee-black-080794`

#### Handle Generation

Handles are generated from product names using the same pattern as other retailers:

```python
def generate_handle(name: str) -> str:
    """Generate URL-friendly handle from product name."""
    handle = name.lower()
    handle = re.sub(r'[^a-z0-9]+', '-', handle)  # Replace special chars with hyphens
    handle = re.sub(r'-+', '-', handle).strip('-')  # Collapse hyphens
    return handle
```

**Example:**
- "Shredded Swiss Cheese & Gruyère Cheese" → "shredded-swiss-cheese-gruy-re-cheese"
- "Cold Brew Coffee Black" → "cold-brew-coffee-black"

#### Country of Origin Parsing

The `country_of_origin` field contains formatted strings that need parsing:

**Patterns:**
- "Product of Turkey" → "Turkey"
- "Made in USA" → "USA"
- "Product of the United States" → "United States"
- "Turkey" → "Turkey" (used as-is if no prefix)

**Extraction Logic:**
- Removes prefixes: "Product of", "Made in", "Produced in", "From", "Imported from"
- Cleans trailing periods and whitespace
- Returns country name only

#### Python Extraction Example

```python
def extract_traderjoes_product(pdp_data: dict) -> dict:
    """Extract product data from Trader Joe's PDP response."""
    sku = pdp_data.get('sku', '')
    
    # Extract category hierarchy
    category_hierarchy = pdp_data.get('category_hierarchy', [])
    level_3_name = ''
    level_4_name = ''
    for cat in sorted(category_hierarchy, key=lambda x: x.get('level', 0)):
        if cat.get('level') == 3:
            level_3_name = cat.get('name', '')
        elif cat.get('level') == 4:
            level_4_name = cat.get('name', '')
    
    # Generate handle from name
    handle = generate_handle(pdp_data.get('item_title', ''))
    
    # Generate product page URL
    product_page_url = f"https://www.traderjoes.com/home/products/pdp/{handle}-{sku}"
    
    # Parse country of origin
    origin_text = pdp_data.get('country_of_origin', '')
    origin_country = parse_country_of_origin(origin_text)  # "Product of Turkey" → "Turkey"
    
    # Clean HTML from marketing story
    description = clean_html(pdp_data.get('item_story_marketing', ''))
    
    return {
            'external_id': sku,
        'barcode': sku_to_ean8(sku),
        'name': pdp_data.get('item_title'),
        'handle': handle,
        'brand': "Trader Joe's",
        'cost_price': pdp_data.get('retail_price'),
        'size': str(pdp_data.get('sales_size', '')) if pdp_data.get('sales_size') else None,
        'size_uom': pdp_data.get('sales_uom_description'),
        'description': description,
        'product_page_url': product_page_url,
        'origin_country': origin_country,
        'category_name': level_4_name or level_3_name,
        'parent_category': level_3_name if level_4_name else '',
        'full_category_hierarchy': category_hierarchy,
        'metadata': {'pdp_data': pdp_data, 'scraped_at': datetime.now(timezone.utc).isoformat()},
        'image_urls': extract_images(pdp_data),  # primary_image + other_images
        'raw_data': pdp_data,
    }
```

#### Implementation Status
- **Status**: ✅ Production Ready
- **Scraper Location**: `scrapers/trader_joes_scraper.py`
- **Last Scrape**: December 6, 2025
- **Products Scraped**: 2,408 products (90.5% of 2,662 total)
- **Failed Products**: 1 product
- **Scrape Duration**: ~65 minutes (3,901 seconds)
- **Average Rate**: ~1.62 seconds per product

#### Scraping Method
1. **Two-Phase Approach**: 
   - Phase 1: Discover all products via `GetAllProducts` (filtered: published=1, price!=0)
   - Phase 2: Enrich each product with PDP data via `SearchProduct`
2. **Category Discovery**: Uses PDP `category_hierarchy` to map to Goods categories
3. **Pagination**: Handles pagination automatically (24 items per page default)
4. **Image Collection**: Extracts up to 10 images (primary_image + other_images array) from PDP response
5. **Product Storage**: 
   - Stores products directly to Supabase during scraping
   - Creates `product_store_mappings` entries with `store_name='trader_joes'` and `store_item_id=sku`
   - Creates `product_pricing` records with current prices
   - Stores images in Medusa's `image` table (not `product_images`)
   - **Image Storage Logic**: Images stored in `image` table with `img_` prefix, `rank` (0=primary, 1+=additional), and duplicate checking by URL and product_id
6. **UPC Extraction**: Computes EAN-8 from 6-digit SKU
7. **Field Population**: 
   - `size` field (not `unit_of_measure`)
   - `handle` generated from product name
   - `description` from cleaned `item_story_marketing`
   - `product_page_url` from item_title slug + SKU
   - `origin_country` parsed from `country_of_origin`
   - `metadata` with full PDP JSON
   - `full_category_hierarchy` as JSON string

#### Zebra Scanner Compatibility

EAN-8 barcodes are fully compatible with Zebra scanners:
- Standard EAN-8 symbology supported
- No special configuration needed
- Scans as 8-digit string

**Database Storage:**
- Use `VARCHAR(14)` for barcode field
- Accommodates UPC-12, EAN-8, EAN-13, and GTIN-14
- No need for separate fields per format

#### Session Management

Trader Joe's requires browser-like session handling to bypass bot protection:

**Required Headers:**
- `User-Agent`: Browser user agent string
- `Accept`: `*/*`
- `Accept-Language`: `en-US,en;q=0.9`
- `Content-Type`: `application/json`
- `Origin`: `https://www.traderjoes.com`
- `Referer`: `https://www.traderjoes.com/home/products/category/products-2` (for discovery) or product-specific PDP URL (for enrichment)
- `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform`: Browser fingerprinting headers
- `sec-fetch-dest`, `sec-fetch-mode`, `sec-fetch-site`: Fetch metadata headers

**Cookie Management:**
- Cookies can be provided via `--cookies-file` argument
- If no cookies provided, scraper establishes session by visiting homepage
- Session cookies are maintained across all GraphQL requests
- Recommended: Extract cookies from browser DevTools for reliable access

#### GraphQL Operations

**GetAllProducts Query:**
```graphql
query GetAllProducts($currentPage: Int, $pageSize: Int) {
    products(
        filter: {
            availability: {match: "1"},
            published: {eq: "1"}
        },
        currentPage: $currentPage,
        pageSize: $pageSize
    ) {
        items {
            sku
            item_title
            retail_price
            sales_size
            sales_uom_description
            primary_image
            other_images
            fun_tags
        }
        total_count
    }
}
```

**SearchProduct Query (PDP Enrichment):**
```graphql
query SearchProduct($sku: String, $published: String = "1") {
    products(
        filter: {sku: {eq: $sku}, published: {eq: $published}}
    ) {
        items {
            sku
            item_title
            retail_price
            sales_size
            sales_uom_description
            primary_image
            other_images
            fun_tags
            category_hierarchy {
                id
                name
                url_key
                level
            }
            item_story_marketing
            country_of_origin
        }
    }
}
```

#### Notes & Limitations
- No UPC in API - must compute EAN-8 from SKU
- In-store locations not available (Trader Joe's stores have unique layouts)
- Most products are Trader Joe's private label (brand = "Trader Joe's")
- Fresh/deli items use GS1 DataBar (complex, not implemented)
- Two-phase scraping required for complete data (discovery + PDP enrichment)
- Session/cookie management critical for reliable API access
- Product page URLs generated from item_title + SKU (not from `url_key` field)
- Category mapping uses actual Supabase category names (case-insensitive lookup)
- All products filtered by `published: "1"` and `price != 0` to ensure active inventory only

---

## Product Image Collection

### Image Collection Rules

- **Maximum Images**: Collect up to 10 product images per product
- **Image Sources**: 
  - Primary image (always included if available)
  - Alternate/additional images from retailer APIs
  - Limit total to 10 images per product
- **Storage Logic**: 
  - Images are **only stored on the first scrape** when a UPC is encountered
  - If images already exist for a product (matched by UPC), **do not overwrite** them
  - This ensures image data is preserved even if subsequent scrapes don't include image data
- **Image Priority**: 
  1. Primary image (first position)
  2. Alternate images in order provided by retailer API
  3. Additional images from other sources (e.g., content_labels, gallery images)

### Image Extraction Pattern

All scrapers should follow this pattern:

```python
def extract_images(data: dict, max_images: int = 10) -> list[str]:
    """Extract up to 10 product images from retailer API response."""
    image_urls = []
    
    # 1. Get primary image
    primary = get_primary_image(data)  # Retailer-specific extraction
    if primary:
        image_urls.append(primary)
    
    # 2. Get alternate/additional images
    alternates = get_alternate_images(data)  # Retailer-specific extraction
    for alt in alternates:
        if len(image_urls) >= max_images:
            break
        if alt and alt not in image_urls:  # Avoid duplicates
            image_urls.append(alt)
    
    return image_urls[:max_images]
```

### Database Storage

Images are stored in the `product_images` table with the following structure:
- `product_id` - References the products table (matched by UPC)
- `image_url` - URL of the image
- `image_order` - Order/position of image (1 = primary, 2-10 = alternates)
- `created_at` - Timestamp when image was first stored

**Storage Logic:**
```python
def store_product_images(product_id: UUID, image_urls: list[str], supabase_client):
    """Store product images only if they don't already exist."""
    # Check if images already exist for this product
    existing = supabase_client.table('product_images').select('image_url').eq(
        'product_id', product_id
    ).execute()
    
    existing_urls = {img['image_url'] for img in existing.data}
    
    # Only insert new images that don't already exist
    new_images = []
    for idx, img_url in enumerate(image_urls, start=1):
        if img_url and img_url not in existing_urls:
            new_images.append({
                'product_id': product_id,
                'image_url': img_url,
                'image_order': idx,
                'created_at': datetime.now(timezone.utc).isoformat()
            })
    
    if new_images:
        supabase_client.table('product_images').insert(new_images).execute()
```

## Unified Field Mapping

### Retailer to Goods Schema

| Goods Field | HEB | Walmart | Target | Costco | Central Market | Whole Foods | Trader Joe's |
|-------------|-----|---------|--------|--------|----------------|-------------|--------------|
| `external_id` | productId | usItemId | tcin | itemNumber | productId | asin | sku |
| `barcode` | upc | upc | primary_barcode | item_manufacturing_skus* | sku | (API lookup) | (computed EAN-8) |
| `name` | description | name | product_description.title | productName | description | title | item_title |
| `brand` | brand.name | brand | primary_brand.name | brand | brand.name | brand | brand |
| `cost_price` | currentPrice.amount | priceInfo.currentPrice.price | price.current_retail | priceTotal | currentPrice.amount | price.value | retail_price |
| `list_price` | originalPrice.amount | priceInfo.wasPrice.price | price.reg_retail | originalPrice | originalPrice.amount | - | - |
| `price_per_unit` | unitListPrice.amount | unitPrice.priceString* | formatted_unit_price | unitPriceAmount | unitListPrice.amount | price.perUnitPrice | - |
| `price_per_unit_uom` | unitListPrice.unit | pricePerUnitUom | formatted_unit_price_suffix | unitPriceUom | unitListPrice.unit | price.perUnitPriceUom | - |
| `size` | size | - | - | - | size | - | sales_size |
| `image_urls` | image.url (array) | imageInfo.thumbnailUrl, imageInfo.imageUrls[] | enrichment.images.primary_image_url + alternate_image_urls[] | productImageUrl, productImages[] | image.url (array) | images[].url | primary_image, images[] |
| `store_location` | aisle_location | productLocation[].displayValue | store_positions[].aisle** | - | aisle_location | location.aisle*** | - |
| `store_zone` | - | productLocation[].aisle.zone | - | - | - | - | - |
| `store_aisle` | - | productLocation[].aisle.aisle | store_positions[].aisle | - | - | - | - |
| `store_block` | - | - | store_positions[].block | - | - | - | - |
| `store_floor` | - | - | store_positions[].floor | - | - | - | - |
| `rating` | averageRating | averageRating | rating.average | averageOverallRating | - | - | - |
| `review_count` | reviewCount | numberOfReviews | review_count | totalReviewCount | - | - | - |
| `size` | size | - | - | - | size | - | sales_size |
| `size_uom` | - | - | - | - | - | - | sales_uom_description |
| `handle` | (generated) | (generated) | (generated) | (generated) | (generated) | (generated) | (generated) |
| `description` | - | - | - | - | - | - | item_story_marketing* |
| `product_page_url` | - | - | - | - | - | - | (computed: item_title slug + SKU) |
| `origin_country` | - | - | - | - | - | - | country_of_origin* |
| `metadata` | - | - | - | - | - | - | (full PDP JSON) |
| `full_category_hierarchy` | - | - | - | - | - | - | category_hierarchy[] |

**Notes:**
- `*` Requires parsing/conversion
- `**` Requires separate fulfillment API call
- `***` Requires authentication

---

## Item Filtering

### Category Filtering

All scrapers use category filtering to ensure only grocery-related items are scraped. This filtering is implemented in `scrapers/category_mapping.py` and applied via `scrapers/base_scraper.py`.

#### Grocery Categories

The following top-level categories are considered grocery-related and will be scraped:

- `fruit_vegetables` - Fresh produce, fruits, and vegetables
- `meat_seafood` - Meat, poultry, seafood, and plant-based alternatives
- `bakery_bread` - Bread, tortillas, pastries, and baked goods
- `dairy_eggs` - Milk, cheese, yogurt, eggs, and dairy products
- `deli_prepared_food` - Deli items, prepared meals, and party trays
- `pantry` - Canned goods, pasta, rice, condiments, snacks, and pantry staples
- `frozen_food` - Frozen meals, vegetables, ice cream, and frozen items
- `beverages` - Water, juice, soda, coffee, tea (excludes alcohol subcategories)
- `everyday_essentials` - Limited to grocery-relevant items (cleaning supplies, paper products)
- `health_beauty` - Limited to vitamins and supplements
- `baby_kids` - Limited to baby food and formula
- `pets` - Pet food only

#### Excluded Subcategories

The following subcategories are explicitly excluded from scraping:

**Alcohol:**
- `beer_wine`
- `wine`
- `beer`
- `liquor`
- `cocktail_mixes`
- `hard_cider`

**Non-Food Items:**
- `flowers`
- `gift_baskets`
- `home_decor`
- `aromatherapy`
- `electronics`
- `clothing`
- `toys` (unless baby food related)

**Promotional/Duplicate Categories:**
- `emergency_food`
- `food_gifts`

#### Filtering Functions

- **`should_include_category(retailer, category_path, parent)`**: Determines if a retailer category should be included in scraping. Returns `True` if the category maps to a grocery category and is not excluded.
- **`is_grocery_category(goods_category, goods_subcategory)`**: Checks if a Goods category/subcategory is grocery-related. Returns `True` if the category is in `GROCERY_CATEGORIES` and the subcategory is not in `EXCLUDED_SUBCATEGORIES`.
- **`filter_grocery_categories(categories)`**: Method in `BaseScraper` that filters a list of categories to only include grocery items. Used by all scrapers that inherit from `BaseScraper`.

### Product-Level Filtering

Retailer-specific filtering rules are applied at the product level:

#### Target

Products are filtered based on in-store availability:

- Products with `in_store_only.availability_status == "NOT_SOLD_IN_STORE"` are excluded
- Products returning 404 from the fulfillment API are excluded (indicates not available in-store)
- Only products with physical store locations are kept
- Implementation: `scripts/filter_target_not_sold_in_store.py`

#### Costco

Location-specific inventory filtering:

- Only `InWarehouse` items are scraped (items currently in warehouse inventory)
- Items not in current inventory are deactivated after scrape completes
- Implementation: `scrapers/costco_scraper.py` and `scripts/imports/import_costco_fusion_api.py`

#### Central Market

Store-specific availability filtering:

- Products are filtered based on store-specific availability
- Uses store ID to determine which products are available at specific locations

#### HEB

Category-based filtering:

- Only grocery categories are scraped (as defined in `GROCERY_CATEGORIES`)
- Non-grocery categories are automatically excluded via `filter_grocery_categories()`

### Active Inventory Rules

For determining which items should be considered "active inventory" in the Goods system, see `docs/technical/active-inventory-rules.md`.

**Key Rules Summary:**
- **Expiration Date**: Food with expiration <24 hours is inactive
- **Fresh Produce**: Refrigerated produce is inactive (except onions, potatoes, garlic, berries, packaged salad blends)
- **Prepared Items**: Cut-to-order items (deli, meat market, fish market) are inactive
- **Weighed-to-Order**: Custom weighed items are inactive
- **Frozen Items**: Generally active
- **Shelf-Stable**: Generally active (no expiration check needed)

These rules are contextual and item-specific, not category-wide. Items are evaluated against all applicable rules to determine active status.

---

## Inventory Heuristics

### Daily Scraping Schedule

#### Schedule Overview

- **Start Time**: 7:00 AM CST daily
- **Completion Deadline**: 12:00 PM (noon) CST
- **Maximum Duration**: 5 hours per retailer (after optimization)
- **Purpose**: Pull active stock status for all retailers to update inventory availability

#### Scraping Workflow

1. All retailer scrapers run in parallel starting at 7:00 AM CST
2. Each scraper updates `product_store_mappings.is_active` based on current availability
3. Each scraper updates `product_pricing` with current prices and `effective_from` timestamps
4. All scrapes must complete by 12:00 PM CST to allow time for shopping list generation

#### Shopping List Generation (12:00 PM - Multi-Cart Sweep Start)

After all scrapes complete, shopping lists are generated for multi-cart shoppers:

- **Price Optimization**: When items are available at multiple retailers, select the retailer with the lowest price
- Shopping lists prioritize:
  1. Items needed for pending orders
  2. Lowest price when multiple retailers have stock
  3. Store proximity and route optimization

### Stock Status Tracking

#### Database Fields

- `product_store_mappings.is_active` - Boolean flag for store-level availability (updated daily)
- `product_pricing.effective_from` - Timestamp when price/availability was recorded (daily scrape timestamp)
- `product_pricing.effective_to` - Timestamp when price/availability ended (NULL = current)
- `product_store_mappings.last_seen_at` - Timestamp of last successful scrape (NEW FIELD - to be added)
- `product_store_mappings.out_of_stock_count` - Consecutive days product not found (NEW FIELD - to be added)
- `product_store_mappings.deactivation_reason` - Reason for deactivation (NEW FIELD - optional, for audit trail)

#### Stock Status States

- **IN_STOCK**: Product found in current scrape, `is_active = True`
- **OUT_OF_STOCK**: Product not found in current scrape but previously active
- **DISCONTINUED**: Product not found for N consecutive scrapes (default: 4)
- **NOT_SOLD_IN_STORE**: Product marked as online-only (Target-specific)
- **UNAVAILABLE**: Product returns 404 or error from API

### Daily Stock Status Update Process

#### Step 1: Scrape Execution (7:00 AM - 12:00 PM)

- Each scraper tracks `discovered_product_ids` during scrape
- For each product found:
  - Set `product_store_mappings.is_active = True`
  - Set `product_store_mappings.last_seen_at = current_timestamp`
  - Update `product_pricing` with current price and `effective_from = current_timestamp`
  - Reset `out_of_stock_count = 0` if previously out of stock

#### Step 2: Post-Scrape Deactivation (After 12:00 PM)

- For each retailer, identify products not in `discovered_product_ids`:
  - Increment `out_of_stock_count`
  - If `out_of_stock_count >= 4`: Set `is_active = False`, mark as DISCONTINUED, set `deactivation_reason = 'DISCONTINUED'`
  - If `out_of_stock_count < 4`: Keep `is_active = True` but mark as OUT_OF_STOCK
  - Set `product_pricing.effective_to = current_timestamp` for last known price

#### Step 3: Shopping List Generation (12:00 PM - Sweep Start)

- Query all active products needed for pending orders
- For each product:
  - Find all retailers where `product_store_mappings.is_active = True`
  - Select retailer with lowest `product_pricing.price` (where `effective_to IS NULL`)
  - If multiple retailers have same price, prefer:
    a. Retailer with aisle location (easier to find)
    b. Retailer with higher `last_seen_at` (more recently verified)
    c. Default retailer preference (HEB > Target > Walmart > Costco > Central Market)
- Group items by retailer for efficient shopping
- Include store location, aisle information, and item details
- Sort by store location and aisle for efficient shopping
- Include backup retailers (2-3 options sorted by price) for flexibility

### Out-of-Stock Detection Rules

#### Rule 1: Daily Consecutive Out-of-Stock Detection

- Track consecutive daily scrapes where product is not found
- Default threshold: **4 consecutive scrapes** = DISCONTINUED
- Implementation:
  - Store `out_of_stock_count` in `product_store_mappings`
  - Increment on each daily scrape where product is missing
  - Reset to 0 when product is found again
  - When count reaches threshold: set `is_active = False`, mark as DISCONTINUED

#### Rule 2: Availability Status Tracking

Track availability status from retailer APIs:

- **Target**: `in_store_only.availability_status` (IN_STOCK, OUT_OF_STOCK, NOT_SOLD_IN_STORE, UNAVAILABLE)
- **Walmart**: `availability_status` from product data
- **HEB**: `availability` field from product response
- **Costco**: `InWarehouse` flag from Fusion API
- **Central Market**: Store-specific availability

#### Rule 3: API Error Handling

Products returning 404 from fulfillment/PDP APIs:

- First occurrence: Mark as OUT_OF_STOCK, increment counter
- After 2 consecutive 404s: Mark as UNAVAILABLE
- After 4 consecutive 404s: Mark as DISCONTINUED, deactivate

### Deactivation Rules

#### Rule 1: Automatic Deactivation

Deactivate (`is_active = False`) when:

- Product not found for 4 consecutive daily scrapes (DISCONTINUED)
- Product marked as `NOT_SOLD_IN_STORE` (Target)
- Product returns 404 for 4 consecutive scrapes
- Product not in current inventory (Costco location-specific)

#### Rule 2: Deactivation Process

- Set `product_store_mappings.is_active = False`
- Set `product_store_mappings.updated_at = current_timestamp`
- Set `product_pricing.effective_to = current_timestamp` for last known price
- Set `deactivation_reason` (DISCONTINUED, NOT_SOLD_IN_STORE, etc.)
- Log deactivation event

#### Rule 3: Costco-Specific Deactivation

- After full scrape completes, deactivate all items not in `discovered_product_ids`
- Reference: `scripts/imports/import_costco_fusion_api.py` `deactivate_other_items()` method

### Re-Activation Rules

#### Rule 1: Automatic Re-Activation

Re-activate (`is_active = True`) when:

- Product found in daily scrape after being deactivated
- Product availability changes from NOT_SOLD_IN_STORE to IN_STOCK
- Product returns successfully from API after 404s

#### Rule 2: Re-Activation Process

- Set `product_store_mappings.is_active = True`
- Reset `out_of_stock_count = 0`
- Set `product_store_mappings.last_seen_at = current_timestamp`
- Update `product_store_mappings.updated_at = current_timestamp`
- Clear `deactivation_reason` (set to NULL)
- Create new `product_pricing` record with `effective_from = current_timestamp`

### Stock Status Update Frequency

#### Rule 1: Daily Scrape-Based Updates

- Stock status updated on each daily scraper run (7:00 AM - 12:00 PM CST)
- All retailers scraped in parallel to meet noon deadline
- Frequency: **Daily** (every morning)
- Maximum scrape duration: **5 hours per retailer** (after optimization)

#### Rule 2: Real-Time Status

- Current stock status = most recent daily scrape result (from morning scrape)
- Historical status = tracked via `product_pricing.effective_from/effective_to` timestamps
- Shopping lists use current day's stock status (from morning scrape)

### Shopping List Generation Logic

#### Price Optimization Algorithm

1. Query all pending orders requiring products
2. For each product needed:
   - Find all `product_store_mappings` where `is_active = True` and `store_name` matches active retailers
   - Get current price from `product_pricing` where `effective_to IS NULL` (most recent price)
   - Select retailer with lowest `price` value
   - If multiple retailers have same price, prefer:
     a. Retailer with aisle location (easier to find)
     b. Retailer with higher `last_seen_at` (more recently verified)
     c. Default retailer preference (HEB > Target > Walmart > Costco > Central Market)
3. Group items by retailer
4. Include backup retailers (2-3 options sorted by price) for each item
5. Sort by store location and aisle for efficient shopping

#### Shopping List Structure

- Group items by retailer
- Include store location, aisle information, and item details
- Sort by store location and aisle for efficient shopping
- Include price information for verification at checkout
- Include backup retailer options for items available at multiple stores

#### Handling Unavailable Items

- Items with no active retailers: Mark as "UNAVAILABLE" in shopping list
- Flag for manual sourcing or order cancellation
- Alert operations team for items that cannot be sourced

#### Implementation

- Create `scripts/generate_shopping_lists.py` to run after daily scrapes complete
- Query Supabase for active products and pending orders
- Apply price optimization algorithm
- Generate JSON/CSV shopping lists per retailer
- Integrate with route optimization (Routific) for multi-cart sweeps

### Implementation Guidelines

#### Database Schema Considerations

- Add `out_of_stock_count` INTEGER field to `product_store_mappings` (default: 0)
- Add `last_seen_at` TIMESTAMP field to `product_store_mappings` (tracks last successful scrape)
- Add `deactivation_reason` TEXT field to `product_store_mappings` (optional, for audit trail)
- Use `product_pricing.effective_to` to track when items went out of stock
- Ensure `product_pricing.effective_from` is set to scrape timestamp for daily updates

#### Scraper Integration

Each scraper should:

1. Track which products were found in current scrape (`discovered_product_ids`)
2. Update `is_active = True` and `last_seen_at = current_timestamp` for found products
3. After scrape completes, identify products not in `discovered_product_ids`:
   - Increment `out_of_stock_count`
   - If `out_of_stock_count >= 4`: Set `is_active = False`, mark as DISCONTINUED
4. Update `product_pricing` with current prices and `effective_from = scrape_timestamp`
5. Log deactivation/re-activation events

#### Daily Scraping Automation

- Set up cron job or scheduled task to run all scrapers at 7:00 AM CST
- Run scrapers in parallel (one process per retailer)
- Monitor completion time - alert if any scraper exceeds 5 hours
- After all scrapes complete, trigger shopping list generation

#### Monitoring and Alerts

- Track deactivation rate per retailer
- Alert on unusual deactivation patterns (e.g., >10% of products deactivated in single scrape)
- Report on re-activated products (items coming back in stock)
- Monitor scrape completion times - alert if approaching noon deadline
- Track shopping list generation time and item count
- Alert on items with no active retailers (unavailable items)

### Implementation Examples

#### Daily Stock Status Update (Python Pseudocode)

```python
def update_stock_status_after_scrape(scraper, discovered_product_ids):
    """Update stock status after daily scrape completes."""
    from datetime import datetime, timezone
    
    scrape_timestamp = datetime.now(timezone.utc).isoformat()
    
    # Get all products for this retailer
    retailer = scraper.retailer_name
    all_mappings = supabase.table('product_store_mappings').select('*').eq(
        'store_name', retailer
    ).execute()
    
    for mapping in all_mappings.data:
        store_item_id = mapping['store_item_id']
        
        if store_item_id in discovered_product_ids:
            # Product found - mark as active
            supabase.table('product_store_mappings').update({
                'is_active': True,
                'last_seen_at': scrape_timestamp,
                'out_of_stock_count': 0,
                'updated_at': scrape_timestamp
            }).eq('id', mapping['id']).execute()
            
            # Update pricing
            if mapping.get('was_inactive'):
                # Re-activation - create new pricing record
                supabase.table('product_pricing').insert({
                    'product_id': mapping['product_id'],
                    'store_name': retailer,
                    'price': current_price,
                    'effective_from': scrape_timestamp
                }).execute()
        else:
            # Product not found - increment counter
            new_count = mapping.get('out_of_stock_count', 0) + 1
            
            if new_count >= 4:
                # Deactivate
                supabase.table('product_store_mappings').update({
                    'is_active': False,
                    'out_of_stock_count': new_count,
                    'deactivation_reason': 'DISCONTINUED',
                    'updated_at': scrape_timestamp
                }).eq('id', mapping['id']).execute()
                
                # Close pricing record
                supabase.table('product_pricing').update({
                    'effective_to': scrape_timestamp
                }).eq('product_id', mapping['product_id']).eq(
                    'store_name', retailer
                ).is_('effective_to', 'null').execute()
            else:
                # Still active but out of stock
                supabase.table('product_store_mappings').update({
                    'out_of_stock_count': new_count,
                    'updated_at': scrape_timestamp
                }).eq('id', mapping['id']).execute()
```

#### Shopping List Generation with Price Optimization (Python Pseudocode)

```python
def generate_shopping_lists():
    """Generate shopping lists with price optimization."""
    # Get all pending orders
    orders = supabase.table('orders').select('*, order_items(*, product_id)').eq(
        'status', 'pending'
    ).execute()
    
    shopping_lists = {}  # {retailer: [items]}
    unavailable_items = []
    
    retailer_preference = ['heb', 'target', 'walmart', 'costco', 'central_market']
    
    for order in orders.data:
        for item in order['order_items']:
            product_id = item['product_id']
            quantity = item['quantity']
            
            # Find all active retailers for this product
            mappings = supabase.table('product_store_mappings').select(
                '*, product_pricing(price, effective_to)'
            ).eq('product_id', product_id).eq(
                'is_active', True
            ).execute()
            
            if not mappings.data:
                unavailable_items.append({
                    'product_id': product_id,
                    'order_id': order['id'],
                    'quantity': quantity
                })
                continue
            
            # Get current prices (effective_to IS NULL)
            active_mappings = []
            for mapping in mappings.data:
                pricing = mapping.get('product_pricing', [])
                current_price = None
                for price in pricing:
                    if price.get('effective_to') is None:
                        current_price = price['price']
                        break
                
                if current_price:
                    active_mappings.append({
                        'mapping': mapping,
                        'price': current_price,
                        'has_aisle': bool(mapping.get('store_aisle'))
                    })
            
            # Sort by price, then by preference
            active_mappings.sort(key=lambda x: (
                x['price'],
                -x['has_aisle'],  # Prefer items with aisle location
                -retailer_preference.index(x['mapping']['store_name']) if x['mapping']['store_name'] in retailer_preference else 999
            ))
            
            # Select primary retailer (lowest price)
            primary = active_mappings[0]
            retailer = primary['mapping']['store_name']
            
            if retailer not in shopping_lists:
                shopping_lists[retailer] = []
            
            shopping_lists[retailer].append({
                'product_id': product_id,
                'quantity': quantity,
                'price': primary['price'],
                'aisle': primary['mapping'].get('store_aisle'),
                'backup_retailers': [
                    {
                        'retailer': m['mapping']['store_name'],
                        'price': m['price']
                    }
                    for m in active_mappings[1:3]  # Top 2-3 backups
                ]
            })
    
    return shopping_lists, unavailable_items
```

#### Example SQL Queries for Tracking Stock Status

```sql
-- Find products that haven't been seen in 4+ days
SELECT 
    psm.id,
    psm.store_name,
    psm.store_item_id,
    psm.out_of_stock_count,
    psm.last_seen_at,
    p.name
FROM product_store_mappings psm
JOIN products p ON psm.product_id = p.id
WHERE psm.out_of_stock_count >= 4
  AND psm.is_active = True
ORDER BY psm.out_of_stock_count DESC;

-- Get current prices for all active products at a retailer
SELECT 
    psm.store_name,
    psm.store_item_id,
    p.name,
    pp.price,
    pp.effective_from,
    psm.last_seen_at
FROM product_store_mappings psm
JOIN products p ON psm.product_id = p.id
LEFT JOIN product_pricing pp ON pp.product_id = p.id 
    AND pp.store_name = psm.store_name
    AND pp.effective_to IS NULL
WHERE psm.store_name = 'heb'
  AND psm.is_active = True
ORDER BY psm.last_seen_at DESC;

-- Find products that were re-activated today
SELECT 
    psm.store_name,
    psm.store_item_id,
    p.name,
    psm.last_seen_at,
    psm.deactivation_reason
FROM product_store_mappings psm
JOIN products p ON psm.product_id = p.id
WHERE psm.is_active = True
  AND psm.last_seen_at >= CURRENT_DATE
  AND psm.deactivation_reason IS NOT NULL;
```

#### Example Cron Job Configuration

```bash
# Daily scraping schedule - runs at 7:00 AM CST
0 7 * * * /usr/bin/python3 /path/to/scripts/run_daily_scrapes.py >> /var/log/daily_scrapes.log 2>&1

# Shopping list generation - runs at 12:15 PM CST (after scrapes complete)
15 12 * * * /usr/bin/python3 /path/to/scripts/generate_shopping_lists.py >> /var/log/shopping_lists.log 2>&1
```

#### Example Scraper Integration Pattern

```python
class BaseScraper:
    def run_daily_scrape(self):
        """Run daily scrape with stock status tracking."""
        from datetime import datetime, timezone
        
        scrape_timestamp = datetime.now(timezone.utc).isoformat()
        self.discovered_product_ids = set()
        
        # Run scrape
        categories = self.discover_categories()
        categories = self.filter_grocery_categories(categories)
        
        for category in categories:
            products = self.scrape_category(category)
            for product in products:
                # Store product and track ID
                self.store_product_in_supabase(product)
                self.discovered_product_ids.add(product.get('external_id'))
        
        # Update stock status
        self.update_stock_status_after_scrape(scrape_timestamp)
    
    def update_stock_status_after_scrape(self, scrape_timestamp):
        """Update stock status for products found/not found."""
        # Implementation as shown in Daily Stock Status Update example above
        pass
```

---

## Category Mapping Strategy

### Approach

Map each retailer's category structure to a unified Goods taxonomy:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CATEGORY NORMALIZATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Retailer Categories          Goods Categories                  │
│  ───────────────────          ────────────────                  │
│                                                                 │
│  HEB: "Fresh Produce" ──────► "Produce"                         │
│  Walmart: "Fresh Fruits" ───► "Produce > Fruit"                 │
│  Target: "Fruit & Vegetables"► "Produce"                        │
│  Whole Foods: "Produce" ────► "Produce"                         │
│  TJ's: "Fruits & Vegetables"► "Produce"                         │
│                                                                 │
│  HEB: "Meat & Seafood" ─────► "Meat & Seafood"                  │
│  Walmart: "Meat" ───────────► "Meat & Seafood > Meat"           │
│  Costco: "Meat" ────────────► "Meat & Seafood > Meat"           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Goods Master Categories

```
1. Baby & kids
   ├── Baby safety
   │  ├── Door & drawer locks
   │  └── Electrical protection
   ├── Bath tubs & accessories
   │  ├── Bath accessories
   │  └── Bath tubs
   ├── Clothes
   │  └── Bibs
   ├── Diapers & potty
   │  ├── Baby wipes
   │  ├── Changing pads
   │  ├── Diaper bags & storage
   │  ├── Diaper pails & refills
   │  ├── Diapers
   │  ├── Potty seats & stools
   │  └── Training pants
   ├── Feeding
   │  ├── Bottle feeding
   │  │  ├── Bottles
   │  │  ├── Carrying & warming
   │  │  ├── Cleaning
   │  │  └── Nipples
   │  ├── Breast feeding
   │  │  ├── Breast feeding accessories
   │  │  ├── Breast feeding supplements
   │  │  ├── Breast pumps
   │  │  ├── Milk storage
   │  │  └── Nursing pads
   │  ├── Cups
   │  ├── Dishes & utensils
   │  └── Pacifiers
   ├── Food & formula
   │  ├── Baby food
   │  ├── Electrolytes & shakes
   │  ├── Formula
   │  ├── Juice & water
   │  └── Toddler food
   ├── Health & skin care
   │  ├── Bath & hair care
   │  ├── Bug repellent
   │  ├── Humidifiers
   │  ├── Lotion & powder
   │  ├── Medical devices & supplies
   │  ├── Nose wipes
   │  ├── Surface wipes
   │  └── Teething
   ├── Nursery & kids' room
   │  ├── Blankets & pillows
   │  ├── High chairs & booster seats
   │  └── Sleep aids
   ├── Toys
   │  ├── Action figures & dolls
   │  ├── Baby toys
   │  ├── Dress up & pretend play
   │  ├── Games & books
   │  │  ├── Books & coloring
   │  │  ├── Games
   │  │  ├── Puzzles
   │  │  └── Spinners & yo-yos
   │  ├── Lego & building blocks
   │  ├── Outdoor toys
   │  │  ├── Balls
   │  │  ├── Blasters
   │  │  ├── Bubbles
   │  │  └── Yard & sandbox toys
   │  ├── Playsets
   │  ├── Plush toys
   │  ├── Remote control toys
   │  ├── Slime
   │  └── Toy vehicles
   └── Travel equipment
      ├── Covers & shades
      └── Mirrors

2. Bakery & bread
   ├── Bread
   │  ├── Bagels
   │  ├── Buns & rolls
   │  ├── English muffins
   │  ├── Loaves
   │  ├── Pitas & flatbread
   │  ├── Pizza crusts
   │  └── Sliced bread
   ├── Cakes
   │  ├── Standard cakes
   │  └── Standard cupcakes
   └── Desserts & pastries
      ├── Brownies & bars
      ├── Cheesecakes
      ├── Cream puffs & eclairs
      ├── Croissants & puff pastries
      ├── Cupcakes
      ├── Donuts
      ├── Flan & bread pudding
      ├── Muffins
      ├── Pies
      ├── Sweet rolls & scones
      └── Tarts & macarons

3. Beverages
   └── Beer & wine
      ├── Beer
      ├── Cocktail mixers
      ├── Hard cider
      ├── Malt beverages & coolers
      └── Wine

4. Deli & prepared food
   ├── Party trays
   │  └── Standard party trays
   └── Ready meals & snacks
      ├── Appetizers
      ├── Entrees & sides
      ├── Meal kits
      ├── Pizza
      ├── Salads
      ├── Sandwiches
      ├── Snack trays
      ├── Soup
      └── Sushi

5. Everyday essentials
   ├── Air fresheners & candles
   │  ├── Air fresheners
   │  ├── Candles
   │  ├── Diffusers
   │  ├── Incense
   │  ├── Moisture absorbers
   │  └── Scented oils & wax
   ├── Cleaners
   │  ├── All purpose cleaners
   │  ├── Carpet & upholstery cleaners
   │  ├── Dish soap & detergent
   │  ├── Drain cleaners
   │  ├── Metal & stone cleaners
   │  ├── Oven & stove cleaners
   │  ├── Toilet bowl cleaners
   │  └── Wood cleaner & polish
   ├── Cleaning tools
   │  ├── Brooms & dust mops
   │  ├── Brushes
   │  ├── Buckets & caddies
   │  ├── Cleaning cloths & dusters
   │  ├── Dish drainers
   │  ├── Dustpans
   │  ├── Gloves
   │  ├── Mops
   │  ├── Sponges & scrubbers
   │  ├── Spray bottles & squeegees
   │  └── Trash cans
   ├── Disposable kitchenware
   │  ├── Bakeware
   │  ├── Drinkware
   │  ├── Flatware & utensils
   │  ├── Napkins & table cloths
   │  ├── Plates & bowls
   │  ├── Serveware
   │  ├── Straws
   │  └── Toothpicks
   ├── Food storage & wraps
   │  ├── Chip clips
   │  ├── Containers
   │  ├── Foil & plastic wrap
   │  ├── Reusable shopping bags
   │  └── Storage bags
   └── Laundry
      ├── Bleach
      ├── Detergent
      ├── Fabric dye
      ├── Fresheners
      ├── Hampers & laundry bags
      ├── Ironing
      ├── Lint rollers
      ├── Sewing
      ├── Softeners
      ├── Stain removers
      └── Starch

6. Frozen food
   ├── Bread & baked goods
   │  ├── Bread
   │  │  ├── Bagels
   │  │  ├── Biscuits
   │  │  ├── Buns & rolls
   │  │  ├── Loaves
   │  │  ├── Pitas & flatbread
   │  │  └── Pizza crusts
   │  ├── Desserts & pastries
   │  └── Tortillas
   ├── Fruit
   │  ├── Bananas
   │  ├── Berries & cherries
   │  ├── Mixed fruit
   │  ├── Peaches
   │  └── Tropical & specialty
   ├── Ice cream & treats
   │  ├── Bars & pops
   │  ├── Cones & sandwiches
   │  ├── Frozen yogurt
   │  ├── Ice cream
   │  ├── Sorbet
   │  ├── Sundae toppings
   │  └── Waffle bowls & cones
   ├── Meals & sides
   │  ├── Appetizers
   │  ├── Entrees & sides
   │  ├── Pizza
   │  ├── Sandwiches
   │  └── Soup
   ├── Meat
   │  ├── Beef & veal
   │  ├── Chicken
   │  ├── Duck & quail
   │  ├── Meatballs
   │  ├── Pork
   │  ├── Sausages & hot dogs
   │  └── Turkey
   ├── Seafood
   │  ├── Fish
   │  └── Shrimp & shellfish
   └── Vegetables
      ├── Artichokes & asparagus
      ├── Beans & peas
      ├── Broccoli, cauliflower & cabbage
      ├── Corn
      ├── Leafy greens
      ├── Mixed vegetables
      ├── Onions & garlic
      ├── Peppers
      ├── Potatoes & carrots
      ├── Specialty & Asian
      └── Squash & zucchini

7. Fruit & vegetables
   ├── Fruit
   │  ├── Apples
   │  ├── Bananas
   │  ├── Berries & cherries
   │  ├── Citrus
   │  ├── Grapes
   │  ├── Melons
   │  ├── Mixed fruit
   │  ├── Pears
   │  └── Specialty & tropical
   └── Vegetables
      ├── Artichokes & asparagus
      ├── Avocados
      ├── Beans & peas
      ├── Broccoli, cauliflower & cabbage
      ├── Celery & cucumbers
      ├── Corn
      ├── Herbs
      ├── Lettuce & leafy greens
      ├── Mixed vegetables
      ├── Mushrooms
      ├── Onions & garlic
      ├── Peppers
      ├── Potatoes & carrots
      ├── Specialty & Asian
      ├── Squash & pumpkins
      └── Tomatoes

8. Health & beauty
   ├── Bath & skin care
   │  ├── Accessories
   │  ├── Bath & skin care sets
   │  ├── Body powder
   │  ├── Body scrubs
   │  ├── Bubble bath & salts
   │  ├── Cleansers & soaps
   │  │  ├── Body wash
   │  │  ├── Facial cleansers & scrubs
   │  │  ├── Hand & bar soap
   │  │  ├── Hand sanitizer
   │  │  ├── Makeup remover
   │  │  └── Toners
   │  ├── Deodorant & antiperspirant
   │  ├── Essential oils
   │  ├── Facial masks & treatments
   │  ├── Fragrance
   │  ├── Moisturizers
   │  │  ├── Body lotion
   │  │  ├── Eye cream
   │  │  └── Facial moisturizer
   │  ├── Shaving & hair removal
   │  │  ├── Aftershave
   │  │  ├── Beard care
   │  │  ├── Depilatories & wax
   │  │  ├── Electric shavers & trimmers
   │  │  ├── Razors & blades
   │  │  └── Shaving cream
   │  └── Sunscreen & self tanners
   ├── Eye & ear care
   │  ├── Contact lens solution & cases
   │  ├── Ear plugs
   │  ├── Ear wash & drops
   │  ├── Eye drops & lubricants
   │  ├── Eye wash
   │  └── Eyewear & accessories
   ├── Feminine care
   │  ├── Medicines & treatments
   │  ├── Pads & liners
   │  ├── Tampons
   │  └── Wipes & washes
   ├── Hair care
   │  ├── Brushes & combs
   │  ├── Curling & flat irons
   │  ├── Hair accessories
   │  ├── Hair color
   │  ├── Hair dryers
   │  ├── Shampoo & conditioner
   │  └── Styling products & treatments
   ├── Home health care
   │  ├── Canes & supports
   │  ├── Diabetic supplies
   │  │  ├── Diabetic lotions
   │  │  ├── Glucose monitors
   │  │  ├── Insulin & glucose
   │  │  ├── Lances
   │  │  ├── Needles
   │  │  └── Test strips
   │  └── Pill cutters & organizers
   ├── Makeup
   │  ├── Eyes
   │  │  ├── Brow pencils & powder
   │  │  ├── Eyeliner
   │  │  ├── Eyeshadow
   │  │  ├── False eyelashes
   │  │  └── Mascara
   │  ├── Face
   │  │  ├── BB cream
   │  │  ├── Blush
   │  │  ├── Bronzers & highlighters
   │  │  ├── Concealer & color corrector
   │  │  ├── Contour
   │  │  ├── Foundation
   │  │  ├── Powder
   │  │  └── Primer & setting spray
   │  ├── Lips
   │  │  ├── Lip gloss
   │  │  ├── Lip liner
   │  │  └── Lipstick
   │  ├── Makeup palettes & sets
   │  └── Makeup tools & accessories
      │  ├── Brushes
      │  ├── Makeup bags
      │  ├── Makeup tools
      │  ├── Mirrors
      │  └── Sponges
   ├── Medicines & treatments
   │  ├── Cough, cold & flu
   │  ├── Digestion & nausea
   │  ├── First aid
   │  │  ├── Antiseptics & antibiotics
   │  │  ├── Bandages & gauze
   │  │  └── Kits & supplies
   │  ├── Hemorrhoid
   │  ├── Lip balm & treatments
   │  ├── Muscle & joint pain
   │  ├── Pain relievers
   │  ├── Sinus & allergy
   │  ├── Skin & scalp treatments
   │  ├── Sleep & snoring aids
   │  ├── Sleeves & braces
   │  ├── Smoking cessation
   │  ├── Thermometers & monitors
   │  └── Vaporizers
   ├── Nails
   │  ├── Manicure & pedicure tools
   │  ├── Nail & cuticle clippers
   │  ├── Nail files
   │  ├── Nail polish
   │  ├── Nail sets
   │  ├── Polish remover
   │  └── Treatments
   ├── Oral hygiene
   │  ├── Bite guards
   │  ├── Denture care
   │  ├── Floss
   │  ├── Mouthwash
   │  ├── Oral pain relief
   │  ├── Toothbrushes
   │  ├── Toothpaste
   │  └── Whiteners
   ├── Sexual wellness
   │  ├── Condoms & contraception
   │  ├── Lubricants
   │  └── Pregnancy & ovulation tests
   └── Vitamins & supplements
      ├── Antioxidants
      ├── Herbs & homeopathy
      ├── Minerals
      ├── Multivitamins
      └── Vitamins A-Z

9. Meat & seafood
   ├── Meat
   │  ├── Bacon
   │  ├── Beef
   │  ├── Bison
   │  ├── Chicken
   │  ├── Hot dogs
   │  ├── Lamb & goat
   │  ├── Pork
   │  ├── Sausage
   │  ├── Turkey
   │  └── Veal
   └── Seafood
      ├── Fish
      └── Shrimp & shellfish

10. Pantry
   ├── Baking ingredients
   │  ├── Baking chocolate & candies
   │  ├── Baking mixes
   │  ├── Baking soda & powder
   │  ├── Coconut flakes
   │  ├── Evaporated milk
   │  ├── Extracts
   │  ├── Flour
   │  ├── Food color
   │  ├── Icing & decorations
   │  ├── Pie crusts
   │  ├── Pie filling
   │  ├── Pudding & gelatin mix
   │  └── Yeast
   ├── Canned & dried food
   │  ├── Beans & legumes
   │  ├── Fruit
   │  │  ├── Apples
   │  │  ├── Bananas
   │  │  ├── Berries & cherries
   │  │  ├── Citrus
   │  │  ├── Mixed fruit
   │  │  ├── Peaches, plums, & apricots
   │  │  ├── Pears
   │  │  ├── Raisins
   │  │  └── Tropical & specialty
   │  ├── Meat
   │  ├── Seafood
   │  └── Vegetables
      │  ├── Artichokes & asparagus
      │  ├── Beets, carrots & potatoes
      │  ├── Cabbage & sauerkraut
      │  ├── Corn
      │  ├── Green beans & peas
      │  ├── Leafy greens
      │  ├── Mixed vegetables
      │  ├── Mushrooms
      │  ├── Olives
      │  ├── Onions & garlic
      │  ├── Peppers
      │  ├── Pickles & cucumber
      │  ├── Specialty & Asian
      │  └── Tomatoes
   ├── Cereal & breakfast
   │  ├── Cereal
   │  ├── Oatmeal & hot cereal
   │  ├── Pancake mixes
   │  ├── Syrup
   │  └── Toaster pastries
   ├── Condiments
   │  ├── Cocktail & tartar sauce
   │  ├── Horseradish & wasabi
   │  ├── Hot sauce
   │  ├── Ketchup
   │  ├── Mayonnaise & spreads
   │  ├── Mustard
   │  ├── Relish & chutney
   │  ├── Steak sauce
   │  └── Tapenade & bruschetta
   ├── Dressing, oil & vinegar
   │  ├── Oils
   │  ├── Salad dressings
   │  ├── Salad toppings
   │  └── Vinegar & cooking wine
   ├── Pasta & rice
   │  ├── Pasta
   │  └── Rice & grains
   ├── Sauces & marinades
   │  ├── Barbecue sauces
   │  ├── Cooking sauces
   │  ├── Glazes
   │  ├── Gravy
   │  ├── Marinades
   │  ├── Pasta sauces
   │  ├── Soy sauces
   │  └── Specialty sauces
   ├── Snacks & candy
   │  ├── Candy
   │  ├── Chips
   │  ├── Cookies
   │  ├── Crackers & breadsticks
   │  ├── Fruit snacks
   │  ├── Granola & snack bars
   │  ├── Gum & mints
   │  ├── Jerky
   │  ├── Nuts & seeds
   │  ├── Popcorn
   │  ├── Rice cakes
   │  ├── Snack cakes
   │  └── Trail mix
   ├── Spices & seasonings
   │  ├── Herbs & spices
   │  └── Spice mixes
   └── Sugar & sweeteners
      ├── Honey
      ├── Sugar
      └── Sugar substitutes

11. Pets
   ├── Birds
   │  ├── Feeders
   │  ├── Food
   │  └── Treats & toys
   ├── Cats
   │  ├── Food
   │  ├── Healthcare & grooming
   │  ├── Litter & litter boxes
   │  ├── Toys
   │  └── Treats
   └── Dogs
      ├── Cleanup & odor control
      ├── Flea & tick treatments
      ├── Food
      ├── Grooming
      ├── Healthcare
      ├── Toys
   │     ├── Balls & fetch toys
   │     ├── Chew toys
   │     ├── Plush toys
   │     └── Rope & tug toys
      └── Treats
         ├── Biscuits
         ├── Bones & rawhides
         ├── Dental treats
         ├── Jerky treats
         └── Soft & chewy treats
```

### Implementation

```python
# Category mapping table (simplified)
CATEGORY_MAP = {
    'heb': {
        'Fresh Produce': ('produce', None),
        'Fruit': ('produce', 'fruit'),
        'Vegetables': ('produce', 'vegetables'),
        'Meat & Seafood': ('meat_seafood', None),
        'Beef': ('meat_seafood', 'beef'),
        # ...
    },
    'walmart': {
        'Food/Fresh Produce': ('produce', None),
        'Food/Meat & Seafood/Beef': ('meat_seafood', 'beef'),
        # ...
    },
    # ... other retailers
}

def normalize_category(retailer: str, category_path: str) -> tuple[str, str]:
    """Map retailer category to Goods taxonomy."""
    mapping = CATEGORY_MAP.get(retailer, {})
    return mapping.get(category_path, ('uncategorized', None))
```

---

## Database Schema Recommendations

### Core Tables

```sql
-- Products: One row per unique UPC
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(14) UNIQUE,  -- UPC-12, EAN-8, EAN-13, GTIN-14
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    category_id UUID REFERENCES categories(id),
    size VARCHAR(50),
    size_uom VARCHAR(20),
    image_url TEXT,  -- Primary image (backward compatibility, populated from product_images)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Images: Up to 10 images per product
-- Images are only stored on first scrape and never overwritten
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL,  -- 1 = primary, 2-10 = alternates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, image_url)  -- Prevent duplicate images
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_order ON product_images(product_id, image_order);

-- Retailer-specific product data
CREATE TABLE retailer_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    retailer VARCHAR(50) NOT NULL,  -- heb, walmart, target, etc.
    external_id VARCHAR(100) NOT NULL,  -- retailer's product ID
    cost_price DECIMAL(10,2),
    list_price DECIMAL(10,2),
    price_per_unit DECIMAL(10,4),
    price_per_unit_uom VARCHAR(20),
    last_scraped_at TIMESTAMPTZ,
    UNIQUE(retailer, external_id)
);

-- Store-specific data (pricing, location, availability)
CREATE TABLE store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_product_id UUID REFERENCES retailer_products(id),
    store_id VARCHAR(50) NOT NULL,
    cost_price DECIMAL(10,2),  -- Store-specific pricing
    in_stock BOOLEAN DEFAULT true,
    store_location VARCHAR(50),  -- Aisle/zone info
    store_zone VARCHAR(10),
    store_aisle INTEGER,
    last_checked_at TIMESTAMPTZ,
    UNIQUE(retailer_product_id, store_id)
);

-- Price history for arbitrage analysis
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_product_id UUID REFERENCES retailer_products(id),
    store_id VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk item relationships (Costco multi-packs)
CREATE TABLE bulk_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bulk_product_id UUID REFERENCES products(id),
    individual_product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,  -- e.g., 24 for 24-pack
    is_automated BOOLEAN DEFAULT false,
    UNIQUE(bulk_product_id, individual_product_id)
);
```

### Barcode Storage

Use `VARCHAR(14)` to accommodate all formats:

| Format | Length | Example |
|--------|--------|---------|
| EAN-8 | 8 | 00864534 |
| UPC-12 | 12 | 012345678905 |
| EAN-13 | 13 | 0012345678905 |
| GTIN-14 | 14 | 10012345678905 |

### Goods Warehouse Location

The RFC warehouse uses a hierarchical location system for precise product placement. Location codes follow a consistent format that is sortable, speakable, scannable, and unambiguous.

#### Location Code Format

```
{Zone}{Aisle}-{Group}-{Shelf}
```

**Example:** `A03-07-3` → Ambient, Aisle 3, Group 7 (left side), Shelf 3

#### Component Breakdown

| Component | Format | Range | Description |
|-----------|--------|-------|-------------|
| **Zone** | 1 letter | `A` `R` `F` | Temperature zone |
| **Aisle** | 2 digits | `01`-`12` | Aisle number (12 ambient aisles) |
| **Group** | 2 digits | `01`-`22` | Shelf group (odd=left, even=right) |
| **Shelf** | 1 digit | `1`-`5` | Vertical shelf position (1=bottom, 5=top) |

#### Temperature Zones

| Code | Zone | Description |
|------|------|-------------|
| **A** | Ambient | Room temperature, shelf-stable items |
| **R** | Refrigerated | Chilled items (35-40°F) |
| **F** | Frozen | Frozen items (0°F or below) |

#### Odd/Even Group Rule (Like Street Addresses)

| Group Numbers | Side of Aisle |
|---------------|---------------|
| **Odd** (01, 03, 05, 07...) | Left side |
| **Even** (02, 04, 06, 08...) | Right side |

#### Visual Layout (Top-Down View of Single Aisle)

```
AISLE 03
                        
  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
  │01│03│05│07│09│11│13│15│17│19│21│  ← ODD (Left side)
  └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
           
  ═══════════ WALKING PATH ═══════════
           
  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
  │02│04│06│08│10│12│14│16│18│20│22│  ← EVEN (Right side)
  └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
```

#### Vertical Shelf Numbering (Side View)

```
  ┌─────────┐
  │ Shelf 5 │  ← Top
  ├─────────┤
  │ Shelf 4 │
  ├─────────┤
  │ Shelf 3 │
  ├─────────┤
  │ Shelf 2 │
  ├─────────┤
  │ Shelf 1 │  ← Bottom (floor level)
  └─────────┘
```

#### Example Location Codes

| Code | Meaning |
|------|---------|
| `A03-07-3` | Ambient, Aisle 3, Group 7 (left), Shelf 3 |
| `A03-08-3` | Ambient, Aisle 3, Group 8 (right), Shelf 3 |
| `A12-01-5` | Ambient, Aisle 12, Group 1 (left, first), Top shelf |
| `R02-14-1` | Refrigerated, Aisle 2, Group 14 (right), Bottom shelf |
| `F01-03-2` | Frozen, Aisle 1, Group 3 (left), Shelf 2 |

#### Database Schema

```sql
-- Warehouse locations table
CREATE TABLE warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code VARCHAR(12) UNIQUE NOT NULL,  -- 'A03-07-3'
    zone CHAR(1) NOT NULL,                      -- 'A', 'R', 'F'
    aisle INTEGER NOT NULL,                     -- 1-12+
    shelf_group INTEGER NOT NULL,               -- 1-22
    shelf INTEGER NOT NULL,                     -- 1-5
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Computed column for side (L/R)
    side CHAR(1) GENERATED ALWAYS AS (
        CASE WHEN shelf_group % 2 = 1 THEN 'L' ELSE 'R' END
    ) STORED,
    
    CONSTRAINT valid_zone CHECK (zone IN ('A', 'R', 'F')),
    CONSTRAINT valid_aisle CHECK (aisle BETWEEN 1 AND 99),
    CONSTRAINT valid_shelf_group CHECK (shelf_group BETWEEN 1 AND 22),
    CONSTRAINT valid_shelf CHECK (shelf BETWEEN 1 AND 5)
);

CREATE INDEX idx_warehouse_locations_zone ON warehouse_locations(zone);
CREATE INDEX idx_warehouse_locations_aisle ON warehouse_locations(zone, aisle);
CREATE INDEX idx_warehouse_locations_code ON warehouse_locations(location_code);

-- Product location assignment
CREATE TABLE product_warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES source_products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT TRUE,  -- Primary location for this product
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, location_id)
);

CREATE INDEX idx_product_warehouse_product ON product_warehouse_locations(product_id);
CREATE INDEX idx_product_warehouse_location ON product_warehouse_locations(location_id);
```

#### Helper Functions

```sql
-- Generate location code from components
CREATE OR REPLACE FUNCTION generate_location_code(
    p_zone CHAR(1),
    p_aisle INTEGER,
    p_shelf_group INTEGER,
    p_shelf INTEGER
) RETURNS VARCHAR(12) AS $$
BEGIN
    RETURN p_zone || LPAD(p_aisle::TEXT, 2, '0') || '-' ||
           LPAD(p_shelf_group::TEXT, 2, '0') || '-' ||
           p_shelf::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Parse location code into components
CREATE OR REPLACE FUNCTION parse_location_code(p_code VARCHAR(12))
RETURNS TABLE(zone CHAR(1), aisle INTEGER, shelf_group INTEGER, shelf INTEGER, side CHAR(1)) AS $$
BEGIN
    RETURN QUERY SELECT
        SUBSTRING(p_code FROM 1 FOR 1)::CHAR(1) AS zone,
        SUBSTRING(p_code FROM 2 FOR 2)::INTEGER AS aisle,
        SUBSTRING(p_code FROM 5 FOR 2)::INTEGER AS shelf_group,
        SUBSTRING(p_code FROM 8 FOR 1)::INTEGER AS shelf,
        CASE WHEN SUBSTRING(p_code FROM 5 FOR 2)::INTEGER % 2 = 1 THEN 'L' ELSE 'R' END::CHAR(1) AS side;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get human-readable location description
CREATE OR REPLACE FUNCTION location_description(p_code VARCHAR(12))
RETURNS TEXT AS $$
DECLARE
    v_zone TEXT;
    v_side TEXT;
    v_parts RECORD;
BEGIN
    SELECT * INTO v_parts FROM parse_location_code(p_code);
    
    v_zone := CASE v_parts.zone
        WHEN 'A' THEN 'Ambient'
        WHEN 'R' THEN 'Refrigerated'
        WHEN 'F' THEN 'Frozen'
    END;
    
    v_side := CASE v_parts.side
        WHEN 'L' THEN 'Left'
        WHEN 'R' THEN 'Right'
    END;
    
    RETURN v_zone || ', Aisle ' || v_parts.aisle || ', ' ||
           v_side || ' side, Group ' || v_parts.shelf_group || ', Shelf ' || v_parts.shelf;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### UI Display Guidelines

| Context | Format | Example |
|---------|--------|---------|
| **Pick List** | Full code | `A03-07-3` |
| **Spoken** | "Ambient three, seven, shelf three" | - |
| **Barcode Label** | Code + QR | `A03-07-3` with QR |
| **Admin UI** | Code with tooltip | `A03-07-3` → hover shows "Ambient, Aisle 3, Left side, Group 7, Shelf 3" |

#### Benefits of This Format

1. **Sortable**: `A01-01-1` < `A01-01-2` < `A01-02-1` < `A02-01-1` (natural string sort works)
2. **Speakable**: "A-oh-three, oh-seven, three" is quick to say over radio
3. **Scannable**: Short enough for barcode labels on shelf edges
4. **Unambiguous**: No confusing letters (avoiding O/0, I/1, etc.)
5. **Expandable**: Can add more aisles (up to 99) or zones as warehouse grows

#### Notes

- Location codes are assigned when products are physically placed in the warehouse
- Products may have multiple locations (primary + overflow)
- Empty locations are tracked for inventory planning
- Separate from retailer store locations (stored in `product_store_mappings`)

---

## Implementation Checklist

### Per Retailer Setup

- [ ] Identify API endpoints (search, PDP, fulfillment)
- [ ] Document authentication requirements
- [ ] Map fields to Goods schema
- [ ] Implement barcode extraction/conversion
- [ ] Test with sample products
- [ ] Handle rate limiting and bot detection
- [ ] Set up monitoring for API changes

### Data Pipeline

- [ ] Scrape categories → Build category map
- [ ] Scrape products → Extract base data
- [ ] Fetch UPCs (PDP or conversion)
- [ ] Normalize categories
- [ ] Deduplicate by UPC
- [ ] Store in database
- [ ] Track price history
- [ ] Handle bulk relationships

---

## Backend Architecture

> How scraped data flows through the Goods system to become sellable products

This section documents the architecture for how scraped retailer data integrates with the Medusa commerce platform in the Goods fork.

### Architecture Overview

The Goods backend follows a **hybrid architecture** (Option C) that cleanly separates concerns:

| Domain | Tables | Purpose |
|--------|--------|---------|
| **Scraping** | `source_products`, `goods_retailer_mapping`, `goods_retailer_pricing` | Raw data from retailers - ALL products scraped |
| **Commerce** | `product`, `product_variant`, `price_set` | Curated catalog - what Goods SELLS |
| **Inventory** | `inventory_item`, `inventory_level`, `inventory_groups` | RFC warehouse stock only |
| **Fulfillment** | `stock_location`, `sweeps`, `sweep_items` | Where to source products |

**Key Insight:** Retailers are **suppliers**, not inventory locations. You don't "stock" items at HEB; you *source* from HEB when needed.

### Current Database State

| Table | Records | Purpose |
|-------|---------|---------|
| `source_products` | 114K+ | Scraped products from all 7 retailers |
| `product_store_mappings` | 119K+ | Links products to retailer-specific SKUs |
| `product` (Medusa) | ~100 | Curated sellable products |
| `product_variant` | 0 | To be populated |
| `inventory_item` | 0 | To be populated |
| `stock_location` | 8 | 7 retailers + Goods RFC |
| `inventory_groups` | 100+ | Hierarchical RFC warehouse locations |

### Stock Locations

The system has 8 stock locations configured:

| Location | Type | Purpose |
|----------|------|---------|
| HEB | Supplier | Source products via sweeps |
| Walmart | Supplier | Source products via sweeps |
| Target | Supplier | Source products via sweeps |
| Costco | Supplier | Source products via sweeps |
| Whole Foods | Supplier | Source products via sweeps |
| Central Market | Supplier | Source products via sweeps |
| Trader Joe's | Supplier | Source products via sweeps |
| **Goods RFC** | Warehouse | Your fulfillment center - actual inventory tracked here |

### Visual Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               SCRAPING LAYER                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ HEB Scraper │ │Walmart Scrap│ │Target Scrap │ │ Costco Scrap│ │WholeFoods   │    │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘    │
│         │               │               │               │               │            │
│         └───────────────┴───────────────┼───────────────┴───────────────┘            │
│                                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                         source_products (STAGING)                              │   │
│  │  • id, name, barcode, brand, image_url, raw_data                              │   │
│  │  • external_id (e.g., "heb-12345" or "walmart-67890")                          │   │
│  │  • Scraped metadata: is_organic, is_vegan, full_category_hierarchy            │   │
│  │  • 114K+ products from all retailers                                           │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                            │
│  ┌──────────────────────────────────────┴────────────────────────────────────────┐  │
│  │                   goods_retailer_mapping (RETAILER DETAILS)                    │  │
│  │  • source_product_id → links to source_products                               │  │
│  │  • stock_location_id → HEB, Walmart, Target, etc.                              │  │
│  │  • store_item_id (retailer SKU), store_item_name                               │  │
│  │  • store_location_text (aisle info at retailer)                                │  │
│  │  • is_available, last_scraped_at                                               │  │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                            │
│  ┌──────────────────────────────────────┴────────────────────────────────────────┐  │
│  │                   goods_retailer_pricing (RETAILER PRICES)                     │  │
│  │  • source_product_id + stock_location_id (composite)                           │  │
│  │  • list_price, sale_price, is_on_sale                                          │  │
│  │  • price_per_unit, price_per_unit_uom                                          │  │
│  │  • effective_from, effective_to (price history)                                │  │
│  │  • Used for cost analysis & sweep optimization                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │  PRODUCT PROMOTION (Manual Curation)      │
                    │  • Match by barcode across retailers       │
                    │  • Curate what Goods actually sells        │
                    │  • Set your selling prices                 │
                    │  • Rules-based filtering (future)          │
                    └─────────────────────┬─────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            COMMERCE LAYER (Medusa)                                   │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │                        product (GOODS CATALOG)                              │     │
│  │  • id, title, handle, description, status                                   │     │
│  │  • Curated products you choose to sell                                      │     │
│  │  • Rich metadata, images, categories                                        │     │
│  │  • NOT all 114K scraped products - just what you sell                       │     │
│  └─────────────────────────────────────┬──────────────────────────────────────┘     │
│                                        │                                             │
│  ┌─────────────────────────────────────┼──────────────────────────────────────┐     │
│  │                       product_variant (SELLABLE SKU)                        │     │
│  │  • id, title, sku, barcode (UPC), ean, upc                                  │     │
│  │  • manage_inventory = true                                                   │     │
│  │  • Usually 1 variant per product for grocery                                 │     │
│  │  • Multiple variants only for true variations (e.g., 6-pack vs 12-pack)     │     │
│  └─────────────────────────────────────┬──────────────────────────────────────┘     │
│                                        │                                             │
│  ┌─────────────────────────────────────┴──────────────────────────────────────┐     │
│  │            product_variant_price_set → price_set → price                    │     │
│  │  • YOUR selling prices to customers                                         │     │
│  │  • Can have price rules (member pricing, promotions)                        │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │            product_goods_source_link (CUSTOM LINK MODULE)                   │     │
│  │  • product_id → Medusa product                                              │     │
│  │  • goods_source_product_link_id → source_products                           │     │
│  │  • Links sellable products back to scraped source data                      │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            INVENTORY LAYER                                           │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │                    inventory_item (MEDUSA STANDARD)                         │     │
│  │  • id, sku (= UPC/barcode), title, requires_shipping                        │     │
│  │  • Links to product_variant via product_variant_inventory_item              │     │
│  │  • Physical item that can be stocked                                        │     │
│  └─────────────────────────────────────┬──────────────────────────────────────┘     │
│                                        │                                             │
│  ┌─────────────────────────────────────┴──────────────────────────────────────┐     │
│  │                    inventory_level (MEDUSA STANDARD)                        │     │
│  │  • inventory_item_id + location_id (Goods RFC only!)                        │     │
│  │  • stocked_quantity - what's in YOUR warehouse                              │     │
│  │  • reserved_quantity - allocated to orders                                   │     │
│  │  • incoming_quantity - on order from suppliers                               │     │
│  │  ⚠️ Only for "Goods RFC" stock_location - NOT retailers                      │     │
│  └─────────────────────────────────────┬──────────────────────────────────────┘     │
│                                        │                                             │
│  ┌─────────────────────────────────────┴──────────────────────────────────────┐     │
│  │              product_inventory_group_link (CUSTOM MODULE)                   │     │
│  │  • product_id → Medusa product                                              │     │
│  │  • inventory_group_id → shelf location in RFC                               │     │
│  │  • Where this product lives in your warehouse                               │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │                inventory_groups (CUSTOM MODULE)                             │     │
│  │  • Hierarchical: Zone → Aisle → Group → Shelf                               │     │
│  │  • location_code: "R01-03-4" (Refrigerated, Aisle 1, Fridge 3, Shelf 4)     │     │
│  │  • zone_code: R (Refrigerated), A (Ambient), F (Frozen)                     │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          FULFILLMENT/SWEEP LAYER                                     │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │                      stock_location (MEDUSA + CUSTOM)                       │     │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐   │     │
│  │  │     HEB     │   Walmart   │   Target    │   Costco    │ Whole Foods │   │     │
│  │  │ (supplier)  │ (supplier)  │ (supplier)  │ (supplier)  │ (supplier)  │   │     │
│  │  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘   │     │
│  │  ┌─────────────┬─────────────┐                                              │     │
│  │  │Cent. Market │ Trader Joe's│                                              │     │
│  │  │ (supplier)  │ (supplier)  │                                              │     │
│  │  └─────────────┴─────────────┘                                              │     │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │     │
│  │  │                        Goods RFC                                     │   │     │
│  │  │   (YOUR warehouse - actual inventory_level tracking here)            │   │     │
│  │  │   Uses inventory_groups for zone/aisle/shelf placement               │   │     │
│  │  └─────────────────────────────────────────────────────────────────────┘   │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │                         sweeps (CUSTOM)                                     │     │
│  │  • Aggregates order items by retailer                                       │     │
│  │  • Uses goods_retailer_mapping to find best source                          │     │
│  │  • Optimizes routes via Routific                                            │     │
│  │  • sweep_items → sweep_order_allocations                                    │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                            │
└──────────────────────────────────────────────────────────────────────────────────┘

1. SCRAPING (Daily)
   ┌─────────┐     ┌─────────────────┐     ┌──────────────────────┐
   │ Scrapers│────▶│ source_products │────▶│goods_retailer_mapping│
   └─────────┘     │ (114K products) │     │goods_retailer_pricing│
                   └────────┬────────┘     └──────────────────────┘
                            │
                            │ Match by barcode (UPC)
                            ▼
2. PRODUCT CURATION (Manual + Rules-Based Filtering)
   ┌─────────────────────────────────────────────────────────────┐
   │  "Promote" source_products to sellable products             │
   │  • Admin manually curates which products to sell            │
   │  • Rules-based filtering for dynamic additions (future)     │
   │  • Sets Goods selling price (margin over cost)              │
   │  • Member pricing options (future)                          │
   └───────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
3. PRODUCT CATALOG (Medusa Commerce)
   ┌──────────────────────────────────────────────────────────────┐
   │  product → product_variant → inventory_item                  │
   │     │            │                   │                       │
   │     │            │                   └──▶ inventory_level    │
   │     │            │                        (RFC stock only)   │
   │     │            │                                           │
   │     │            └──▶ price_set (YOUR selling price)         │
   │     │                                                        │
   │     └──▶ product_goods_source_link ──▶ source_products       │
   │     └──▶ product_inventory_group_link ──▶ inventory_groups   │
   └──────────────────────────────────────────────────────────────┘

4. ORDER FLOW
   ┌─────────────┐     ┌─────────────────────────────────────────┐
   │  Customer   │────▶│  Medusa Cart/Order                      │
   │  Orders     │     │  (product_variant + your price)         │
   └─────────────┘     └──────────────────┬──────────────────────┘
                                          │
                                          ▼
5. FULFILLMENT DECISION
   ┌──────────────────────────────────────────────────────────────┐
   │  For each order item:                                        │
   │                                                              │
   │  Check RFC inventory_level first:                            │
   │  ┌─────────────────────────────────────────────────────────┐ │
   │  │ IF stocked_quantity - reserved_quantity > 0             │ │
   │  │    → Fulfill from RFC (pick_lists, inventory_groups)    │ │
   │  │ ELSE                                                    │ │
   │  │    → Add to sweep (source from retailer)                │ │
   │  └─────────────────────────────────────────────────────────┘ │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
6. SWEEP GENERATION
   ┌──────────────────────────────────────────────────────────────┐
   │  Query goods_retailer_mapping + goods_retailer_pricing       │
   │                                                              │
   │  For product with UPC "049000042566" (Coca-Cola):            │
   │  ┌───────────────┬──────────┬────────┬────────────────────┐  │
   │  │ Retailer      │ Price    │ Avail  │ Aisle              │  │
   │  ├───────────────┼──────────┼────────┼────────────────────┤  │
   │  │ HEB           │ $6.99    │ ✅     │ A12                │  │
   │  │ Walmart       │ $5.98    │ ✅     │ Aisle 7            │  │
   │  │ Target        │ $6.49    │ ❌     │ -                  │  │
   │  │ Costco        │ $14.99*  │ ✅     │ -                  │  │
   │  └───────────────┴──────────┴────────┴────────────────────┘  │
   │  * 24-pack (different UPC)                                   │
   │                                                              │
   │  Sweep optimizer picks based on:                             │
   │  • Availability                                              │
   │  • Price (best margin)                                       │
   │  • Route optimization                                        │
   │  Creates: sweep → sweep_items → sweep_order_allocations      │
   └──────────────────────────────────────────────────────────────┘

7. POST-SWEEP (Manual RFC Restocking)
   ┌──────────────────────────────────────────────────────────────┐
   │  Fast-moving items from sweeps → manually stock in RFC       │
   │  Update inventory_level for "Goods RFC" location             │
   │  Assign to inventory_group shelf location                    │
   └──────────────────────────────────────────────────────────────┘
```

### Entity Relationship Diagram

```
                        SCRAPING DOMAIN                    COMMERCE DOMAIN
                        ══════════════                     ═══════════════

┌──────────────────┐                              ┌──────────────────┐
│  source_products │                              │     product      │
├──────────────────┤                              ├──────────────────┤
│ id (UUID)        │                              │ id (UUID)        │
│ barcode (UPC) ◄──┼──────────────────────────────┼─► title          │
│ name             │                              │ handle           │
│ brand            │    product_goods_source_link │ status           │
│ image_url        │◄─────────────────────────────┤ metadata         │
│ external_id      │                              └────────┬─────────┘
│ raw_data (JSON)  │                                       │
│ is_organic, etc. │                                       │ 1:N
└────────┬─────────┘                                       │
         │                                       ┌─────────▼─────────┐
         │ 1:N                                   │  product_variant  │
         │                                       ├───────────────────┤
┌────────▼─────────────────┐                     │ id                │
│ goods_retailer_mapping   │                     │ barcode (UPC) ◄───┼──── Same UPC!
├──────────────────────────┤                     │ sku               │
│ id                       │                     │ manage_inventory  │
│ source_product_id (FK)   │                     │ title             │
│ stock_location_id (FK) ──┼──┐                  └────────┬──────────┘
│ store_item_id            │  │                           │
│ store_item_name          │  │                           │ M:N
│ is_available             │  │                           │
│ last_scraped_at          │  │             ┌─────────────▼──────────────┐
└────────┬─────────────────┘  │             │product_variant_inventory_item│
         │                    │             └─────────────┬──────────────┘
         │ 1:N                │                           │
         │                    │                           │
┌────────▼─────────────────┐  │             ┌─────────────▼───────────┐
│ goods_retailer_pricing   │  │             │     inventory_item      │
├──────────────────────────┤  │             ├─────────────────────────┤
│ id                       │  │             │ id                      │
│ source_product_id (FK)   │  │             │ sku (UPC) ◄─────────────┼── Same UPC!
│ stock_location_id (FK) ──┼──┤             │ title                   │
│ list_price               │  │             │ requires_shipping       │
│ sale_price               │  │             └────────────┬────────────┘
│ is_on_sale               │  │                          │
│ effective_from/to        │  │                          │ 1:N (RFC only!)
└──────────────────────────┘  │                          │
                              │             ┌────────────▼────────────┐
                              │             │    inventory_level      │
                              │             ├─────────────────────────┤
┌─────────────────────────────▼──┐          │ inventory_item_id (FK)  │
│        stock_location          │          │ location_id (FK) ───────┼──┐
├────────────────────────────────┤          │ stocked_quantity        │  │
│ id                             │◄─────────┼─► Only "Goods RFC"!     │  │
│ name (HEB, Walmart, Goods RFC) │          │ reserved_quantity       │  │
│ address_id                     │          └─────────────────────────┘  │
│ metadata.goods_store_id        │                                       │
└────────────────────────────────┘◄──────────────────────────────────────┘


                        RFC WAREHOUSE DOMAIN
                        ════════════════════

┌──────────────────┐
│     product      │
└────────┬─────────┘
         │
         │ M:N (product_inventory_group_link)
         │
┌────────▼─────────────────┐
│    inventory_groups      │
├──────────────────────────┤
│ id                       │
│ name                     │
│ type (zone/aisle/shelf)  │
│ zone_code (R/A/F)        │
│ aisle_number             │
│ shelf_number             │
│ location_code            │◄─── "R01-03-4"
│ parent_group_id (FK) ────┼──┐
│ mpath                    │  │
└──────────────────────────┘  │
         ▲                    │
         └────────────────────┘
         (self-referential hierarchy)

Hierarchy Example:
  Zone "Refrigerated" (R)
    └── Aisle "Aisle 01" (R01)
        └── Group "Fridge 03" (R01-03)
            └── Shelf "Shelf 4" (R01-03-4)
```

### Key Design Principles

#### 1. Barcode (UPC) is the Canonical Identifier

The same UPC/barcode links data across all domains:

```
source_products.barcode  ═══╗
product_variant.barcode  ═══╬═══► Same UPC across all tables
inventory_item.sku       ═══╝
```

This enables:
- Matching products across retailers (same UPC = same product)
- Linking scraped data to sellable products
- Tracking inventory of the same physical item

#### 2. Retailers are Suppliers, NOT Inventory Locations

```
❌ WRONG: inventory_level at HEB = 50 units
✅ RIGHT: goods_retailer_mapping.is_available = true at HEB
```

Medusa's `inventory_level` only tracks YOUR warehouse (RFC). Retailer availability is tracked in `goods_retailer_mapping` because:
- You don't control retailer stock
- Availability changes constantly
- You source on-demand via sweeps

#### 3. Two-Tier Pricing

```
goods_retailer_pricing  → Cost (what you pay at retailer)
price_set → price       → Selling price (what customer pays)
```

This separation enables:
- Margin analysis
- Dynamic pricing based on cost changes
- Member pricing tiers (future)

#### 4. Manual Curation with Rules Support

Products flow from scraped data to sellable catalog through:

| Step | Method | Notes |
|------|--------|-------|
| Discovery | Automated | Scrapers populate source_products |
| Curation | Manual + Rules | Admin selects products to sell; rules-based filtering for dynamic additions (future) |
| Pricing | Manual + Rules | Admin sets prices; rules for member pricing (future) |
| RFC Stocking | Manual | Admin decides what to stock in warehouse |

### Table Schema Reference

#### source_products (Scraping Staging)

```sql
CREATE TABLE source_products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    barcode VARCHAR(14),           -- UPC-12, EAN-8, EAN-13, GTIN-14
    brand TEXT,
    description TEXT,
    image_url TEXT,
    external_id TEXT,              -- Retailer-specific ID (e.g., "heb-12345")
    raw_data JSONB,                -- Full scraped response
    
    -- Product attributes
    is_organic BOOLEAN,
    is_vegan BOOLEAN,
    is_gluten_free BOOLEAN,
    is_non_gmo BOOLEAN,
    size VARCHAR(50),
    size_uom VARCHAR(20),
    
    -- Categorization
    category_id UUID,
    subcategory_id UUID,
    full_category_hierarchy TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    needs_review BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

#### goods_retailer_mapping (Retailer Details)

```sql
CREATE TABLE goods_retailer_mapping (
    id TEXT PRIMARY KEY,
    source_product_id UUID REFERENCES source_products(id),
    stock_location_id TEXT REFERENCES stock_location(id),
    
    -- Retailer-specific identifiers
    store_item_id TEXT,            -- Retailer's SKU
    store_item_name TEXT,          -- Retailer's product name
    store_image_url TEXT,
    
    -- Availability
    is_available BOOLEAN,
    last_scraped_at TIMESTAMPTZ,
    
    -- In-store location (at retailer)
    store_location_text TEXT,      -- "Aisle 5", "Produce Section"
    
    -- Timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

#### goods_retailer_pricing (Retailer Prices)

```sql
CREATE TABLE goods_retailer_pricing (
    id TEXT PRIMARY KEY,
    source_product_id UUID REFERENCES source_products(id),
    stock_location_id TEXT REFERENCES stock_location(id),
    
    -- Pricing
    list_price NUMERIC,            -- Regular price
    sale_price NUMERIC,            -- Sale price (if on sale)
    is_on_sale BOOLEAN,
    is_price_cut BOOLEAN,
    
    -- Unit pricing
    price_per_unit NUMERIC,
    price_per_unit_uom TEXT,       -- oz, lb, ct, etc.
    price_type TEXT,
    
    -- Effective dates (for price history)
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    
    -- Raw data preservation
    raw_list_price JSONB,
    raw_sale_price JSONB,
    raw_price_per_unit JSONB,
    pricing_context TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

#### inventory_groups (RFC Warehouse Hierarchy)

```sql
CREATE TABLE inventory_groups (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    handle VARCHAR UNIQUE,
    description TEXT,
    
    -- Hierarchy
    parent_group_id VARCHAR REFERENCES inventory_groups(id),
    mpath TEXT,                    -- Materialized path for traversal
    
    -- Location details
    type VARCHAR,                  -- 'zone', 'aisle', 'group', 'shelf'
    zone_code VARCHAR,             -- 'A', 'R', 'F' (Ambient, Refrigerated, Frozen)
    aisle_number INTEGER,
    group_number INTEGER,
    shelf_number INTEGER,
    location_code VARCHAR UNIQUE,  -- "R01-03-4"
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    rank INTEGER DEFAULT 0,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

### Migration Path

#### Phase 1: Data Cleanup & Migration

1. **Keep `source_products` as-is** - Your scraping staging table continues to receive all scraped data
2. **Migrate `product_store_mappings` → `goods_retailer_mapping`**
   - Map `store_name` to `stock_location_id`
   - Preserve retailer-specific SKUs and names
3. **Migrate `product_pricing` → `goods_retailer_pricing`**
   - Separate cost (retailer prices) from selling prices

#### Phase 2: Product Curation Workflow

1. **Create admin workflow** to "promote" source_products to sellable products:
   - Select source_product by barcode
   - Create `product` + `product_variant` in Medusa
   - Link via `product_goods_source_link`
   - Set selling price in `price_set`

2. **Create `inventory_item`** for each product_variant:
   - SKU = barcode
   - Link via `product_variant_inventory_item`

#### Phase 3: RFC Inventory Integration

1. **Create `inventory_level` records** for RFC location only:
   - Link to `inventory_item`
   - Track stocked_quantity, reserved_quantity

2. **Link products to `inventory_groups`**:
   - Via `product_inventory_group_link`
   - Assign shelf locations for pick lists

#### Phase 4: Sweep Integration

1. **Update sweep logic** to query `goods_retailer_mapping`:
   - Check availability across retailers
   - Use `goods_retailer_pricing` for cost optimization

2. **Route optimization**:
   - Group items by retailer
   - Optimize pickup routes via Routific

### Future Enhancements

#### Rules-Based Product Promotion
- Auto-promote products available at 2+ retailers
- Auto-promote high-demand categories
- Quality filters (rating thresholds, brand preferences)

#### Dynamic Pricing Rules
- Margin-based pricing (cost + markup %)
- Competitive pricing (match lowest retailer)
- Member pricing tiers

#### Intelligent RFC Stocking
- Auto-stock fast movers based on sweep frequency
- Seasonal stocking suggestions
- Category-based stocking policies

---

## Appendix

### API Keys and Configuration

Store sensitive configuration in environment variables:

```bash
# .env
HEB_STORE_ID=123
WALMART_STORE_ID=4554
TARGET_API_KEY=9f36aeafbe60771e321a7cc95a78140772ab3e96
ROCKETSOURCE_API_TOKEN=your_token_here
```

### Rate Limiting Best Practices

```python
import time
import random

def rate_limited_request(url, min_delay=1.0, max_delay=3.0):
    """Make a request with randomized delay."""
    time.sleep(random.uniform(min_delay, max_delay))
    # ... make request
```

### Error Handling

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def fetch_product(url):
    """Fetch product with exponential backoff."""
    response = requests.get(url)
    response.raise_for_status()
    return response.json()
```
