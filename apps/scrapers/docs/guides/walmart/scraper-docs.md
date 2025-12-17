# Walmart Scraper Documentation

> Technical documentation for the Walmart grocery product scraper using ScrapFly API

---

## Overview

The Walmart scraper uses **ScrapFly API** to bypass Walmart's aggressive bot detection (PerimeterX) and extract product data including UPCs from the `__NEXT_DATA__` JSON embedded in HTML pages.

### Key Files

| File | Purpose |
|------|---------|
| `walmart_scrapfly_scraper.py` | Main scraper using ScrapFly API |
| `walmart_html_scraper.py` | Alternative HTML scraper (requires cookies) |
| `walmart_graphql_client.py` | Direct GraphQL client (often blocked) |
| `walmart_cookie_manager.py` | Cookie management for session handling |
| `walmart_session_setup.py` | Interactive session setup with real browser |

---

## ScrapFly Integration

### Configuration

```python
# Environment variable
export SCRAPFLY_KEY="scp-live-your-key-here"

# Base configuration
BASE_CONFIG = {
    "asp": "true",           # Anti-Scraping Protection bypass
    "country": "US",         # US-based proxies
    "proxy_pool": "public_residential_pool",  # Residential IPs (required)
}
```

### Credit Costs

| Operation | Credits | Notes |
|-----------|---------|-------|
| Search page | 25 | ~40-60 products per page |
| PDP (no JS) | 25 | Optimized - skips JS rendering |
| PDP (with JS) | 30 | Only needed if no-JS fails |

### Why ScrapFly?

Walmart uses aggressive bot detection:
- **PerimeterX** - JavaScript fingerprinting
- **Akamai Bot Manager** - Request pattern analysis
- **Cookie validation** - Session-based blocking

Direct requests (even with cookies from real browsers) get 412/403 errors. ScrapFly handles all of this automatically with `asp=true`.

---

## Data Extraction

### Source: `__NEXT_DATA__`

Walmart uses Next.js. Product data is embedded in a `<script id="__NEXT_DATA__">` tag:

```python
from bs4 import BeautifulSoup
import json

soup = BeautifulSoup(html, 'html.parser')
script = soup.find('script', {'id': '__NEXT_DATA__'})
next_data = json.loads(script.string)

# Search results
search_result = next_data['props']['pageProps']['initialData']['searchResult']
items = search_result['itemStacks'][0]['items']

# PDP (Product Detail Page)
product = next_data['props']['pageProps']['initialData']['data']['product']
```

### Field Mapping (per RETAILER_SCRAPING_GUIDE.md)

| Walmart Field | Goods Schema | Source | Notes |
|---------------|--------------|--------|-------|
| `usItemId` | `external_id` | Search/PDP | Walmart item ID |
| `upc` | `barcode` | **PDP only** | 12-digit UPC |
| `name` | `name` | Search/PDP | Product name |
| `brand` | `brand` | PDP (sometimes search) | Brand name |
| `price` / `priceInfo.linePrice` | `cost_price` | Search/PDP | Current price |
| `priceInfo.wasPrice` | `list_price` | Search/PDP | Original price (if on sale) |
| `priceInfo.unitPrice` | `price_per_unit` | Search/PDP | e.g., "18.6 ¢/oz" |
| `productLocation[].displayValue` | `store_location` | Search/PDP | e.g., "B3" |
| `productLocation[].aisle.zone` | `store_zone` | Search/PDP | e.g., "B" |
| `productLocation[].aisle.aisle` | `store_aisle` | Search/PDP | e.g., 3 |
| `imageInfo.thumbnailUrl` | `image_url` | Search/PDP | Product image |
| `averageRating` | `rating` | Search/PDP | Customer rating |
| `numberOfReviews` | `review_count` | Search/PDP | Number of reviews |
| `snapEligible` | `snap_eligible` | Search/PDP | SNAP/EBT eligible |

### Important: UPC Requires PDP

UPC is **NOT** available in search results. You must visit each product's detail page to get the barcode:

```python
# Search results - NO UPC
{
    "usItemId": "10452905",
    "name": "Kraft Singles...",
    "upc": null  # Not present!
}

# PDP - HAS UPC
{
    "usItemId": "10452905", 
    "name": "Kraft Singles...",
    "upc": "021000615261"  # ✅ Available
}
```

---

## Usage

### Basic Search (no UPC)

```bash
# 25 credits per page
python walmart_scrapfly_scraper.py --query "cheese" --max-pages 2 --output results.json
```

### Search with UPC Fetching

```bash
# 25 credits per page + 25 per PDP
python walmart_scrapfly_scraper.py --query "cheese" --max-pages 2 --fetch-upc --max-pdp 10 --output results.json
```

### Category Browse

```bash
# Browse by category ID
python walmart_scrapfly_scraper.py --category "976759_976794" --max-pages 3
```

### Single Product

```bash
python walmart_scrapfly_scraper.py --product-url "https://www.walmart.com/ip/product-name/12345"
```

---

## Optimizations

### 1. Skip JS Rendering on PDP

```python
# Before: 30 credits
pdp_data = scraper.scrape_product(url, use_js_rendering=True)

# After: 25 credits (17% savings)
pdp_data = scraper.scrape_product(url, use_js_rendering=False)
```

### 2. Cache UPCs

Once you have a UPC for a product, store it. Don't re-fetch PDPs for products you already have.

### 3. Great Value UPC Patterns

Great Value (Walmart's store brand) UPCs follow patterns. Consider building a pattern matcher:

```python
# Many Great Value products use prefixes:
# 078742... (common)
# 605388... (common)
```

### 4. Proxy Pool

- ✅ `public_residential_pool` - Works reliably
- ❌ `public_datacenter_pool` - Gets blocked (404 errors)

---

## Cost Estimation

### Monthly Walmart Grocery Scrape

| Scenario | Products | Search Credits | PDP Credits | Total |
|----------|----------|----------------|-------------|-------|
| First month (all) | 30,000 | 15,000 | 750,000 | 765,000 |
| First month (optimized) | 30,000 | 15,000 | 600,000 | 615,000 |
| Ongoing (cached) | ~1,500 new | 15,000 | 37,500 | 52,500 |

### Plan Recommendation

| Plan | Credits/Month | Cost | Fits? |
|------|---------------|------|-------|
| Free | 1,000 | $0 | ❌ |
| Pro | 1,000,000 | $100 | ✅ Best value |
| Startup | 2,500,000 | $250 | ✅ Multi-retailer |

---

## Troubleshooting

### Error: 412 Precondition Failed

Walmart's bot detection triggered. Solutions:
1. Use ScrapFly with `asp=true`
2. Use residential proxy pool
3. Add delays between requests

### Error: 404 Not Found

- Product may be discontinued
- Wrong URL format
- Datacenter proxy blocked (switch to residential)

### Error: No `__NEXT_DATA__` Found

- Page may need JS rendering: `render_js=true`
- Page may be a different type (not search/PDP)
- Bot detection may have served a challenge page

### Error: UPC is null

- UPC is only in PDP, not search results
- Must call `scrape_product()` for each item needing UPC

---

## Example Output

```json
{
  "external_id": "10452905",
  "barcode": "021000615261",
  "name": "Kraft Singles American Slices, 24 ct Pack",
  "brand": "Kraft",
  "cost_price": 2.97,
  "list_price": 4.86,
  "price_per_unit": 0.186,
  "price_per_unit_uom": "oz",
  "image_url": "https://i5.walmartimages.com/...",
  "store_location": "B3",
  "store_zone": "B",
  "store_aisle": 3,
  "rating": 4.7,
  "review_count": 13003,
  "snap_eligible": true,
  "url": "https://www.walmart.com/ip/Kraft-Singles.../10452905",
  "in_stock": true,
  "category": "Cheeses"
}
```

---

## Alternative Approaches (Not Recommended)

### Direct GraphQL API

Walmart's Orchestra GraphQL endpoints are heavily protected:
- Requires valid PerimeterX cookies
- Cookies expire within minutes
- 412 errors common even with fresh cookies

### Cookie-based HTML Scraper

`walmart_html_scraper.py` can work with fresh cookies but:
- Cookies expire quickly
- Requires manual CAPTCHA solving
- Not sustainable for production

### Browser Automation (Playwright)

Even with stealth plugins, Playwright is detected:
- PerimeterX fingerprints browser characteristics
- CAPTCHA loops are common
- Not reliable for scale

---

## Files Reference

### walmart_scrapfly_scraper.py

Main production scraper. Key methods:

```python
class WalmartScrapFlyScraper:
    def scrape_search(query, category_id, max_pages, ...)  # Search/browse
    def scrape_product(url, use_js_rendering)              # Single PDP
    def scrape_search_with_upc(query, max_pdp, ...)        # Search + UPC
    def extract_normalized_product(item)                    # Normalize to Goods schema
    def enrich_with_pdp(product)                           # Add UPC to search result
```

### walmart_cheese_full.json

Example output from category scrape with UPC fetching.

### walmart_item_structure.json / walmart_pdp_structure.json

Raw API response structures for reference.

---

## Next Steps

1. **Implement caching** - Store UPCs in database, skip PDPs for known products
2. **Great Value patterns** - Build UPC predictor for store brands
3. **Category mapping** - Map all Walmart grocery categories
4. **Scheduling** - Set up monthly scrape job
5. **Supabase integration** - Store results in database

