# Goods Scrapers

Python-based web scrapers for collecting product data from retail grocery stores.

## Structure

```
scrapers/
├── core/                    # Shared scraper infrastructure
│   ├── base_scraper.py      # Base scraper class
│   ├── category_lookup.py   # Category resolution
│   └── category_mapping.py  # Category mappings
│
├── retailers/               # Retailer-specific scrapers
│   ├── heb/
│   ├── walmart/
│   ├── target/
│   ├── costco/
│   ├── central_market/
│   ├── whole_foods/
│   ├── trader_joes/
│   ├── amazon/
│   └── dollar_tree/
│
├── migrations/              # SQL database migrations
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── config/                  # Configuration files
└── output/                  # Scraper output files
```

## Installation

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development
```

## Usage

Each retailer has a `scraper.py` entry point:

```bash
# Run HEB scraper
python -m retailers.heb.scraper

# Run Walmart scraper
python -m retailers.walmart.scraper
```

## Retailers

| Retailer | Status | Notes |
|----------|--------|-------|
| HEB | Active | GraphQL API |
| Walmart | Active | Browser automation |
| Target | Active | API scraping |
| Costco | Active | Dynamic scraping |
| Central Market | Active | Cookie-based |
| Whole Foods | Active | HTML scraping |
| Trader Joe's | Active | API scraping |
| Amazon | Planned | - |
| Dollar Tree | Planned | - |

## Data Flow

Scraped products are stored in Supabase:
- `source_products` - Product catalog
- `goods_retailer_mapping` - Store availability
- `goods_retailer_pricing` - Price history

## Admin Dashboard

The Medusa admin dashboard includes a Scrapers page for:
- Running scrapers manually
- Viewing scraped products
- Monitoring scraper status

See `packages/admin/goods-admin-extensions/src/routes/scrapers/` for the admin UI.
