#!/bin/bash
# Central Market Full Scrape Script
# Runs in background, logs to file, uses search-based category coverage

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="cm_scrape_$(date +%Y%m%d_%H%M%S).log"
OUTPUT_DIR="cm_scrape_output"

mkdir -p "$OUTPUT_DIR"

echo "Starting Central Market full scrape..."
echo "Log file: $LOG_FILE"
echo "Output directory: $OUTPUT_DIR"

# Ensure cookies are available
if [ -z "$CENTRAL_MARKET_COOKIES" ] && [ ! -f ".central_market_cookies.json" ]; then
    echo "ERROR: No cookies found. Please set CENTRAL_MARKET_COOKIES environment variable"
    exit 1
fi

# Categories to scrape (using search terms that cover different aisles)
# This approach ensures we get products across all departments
CATEGORIES=(
    "produce"
    "fruit"
    "vegetables"
    "meat"
    "beef"
    "chicken"
    "pork"
    "seafood"
    "fish"
    "shrimp"
    "dairy"
    "milk"
    "cheese"
    "yogurt"
    "eggs"
    "butter"
    "bread"
    "bakery"
    "frozen"
    "ice cream"
    "pizza"
    "snacks"
    "chips"
    "cookies"
    "candy"
    "cereal"
    "breakfast"
    "coffee"
    "tea"
    "beverages"
    "juice"
    "soda"
    "water"
    "pasta"
    "rice"
    "beans"
    "soup"
    "sauce"
    "condiments"
    "oil"
    "vinegar"
    "spices"
    "baking"
    "flour"
    "sugar"
    "deli"
    "prepared"
    "salad"
    "baby"
    "organic"
    "gluten free"
    "vegan"
)

TOTAL_PRODUCTS=0
SCRAPED_CATEGORIES=0

for category in "${CATEGORIES[@]}"; do
    echo "----------------------------------------"
    echo "Scraping: $category"
    
    OUTPUT_FILE="$OUTPUT_DIR/cm_${category// /_}.json"
    
    python3 scrapers/central_market_scraper.py \
        --query "$category" \
        --enrich \
        --dry-run \
        --output "$OUTPUT_FILE" \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ -f "$OUTPUT_FILE" ]; then
        COUNT=$(python3 -c "import json; print(len(json.load(open('$OUTPUT_FILE'))))" 2>/dev/null || echo "0")
        TOTAL_PRODUCTS=$((TOTAL_PRODUCTS + COUNT))
        SCRAPED_CATEGORIES=$((SCRAPED_CATEGORIES + 1))
        echo "✅ $category: $COUNT products"
    fi
    
    # Small delay between categories
    sleep 3
done

echo "========================================"
echo "SCRAPE COMPLETE"
echo "Categories scraped: $SCRAPED_CATEGORIES"
echo "Total products: $TOTAL_PRODUCTS"
echo "Output directory: $OUTPUT_DIR"
echo "Log file: $LOG_FILE"
echo "========================================"

# Merge all JSON files into one
echo "Merging all products..."
python3 -c "
import json
import os
import glob

output_dir = '$OUTPUT_DIR'
all_products = {}

for f in glob.glob(os.path.join(output_dir, 'cm_*.json')):
    with open(f) as fp:
        products = json.load(fp)
        for p in products:
            pid = p.get('external_id')
            if pid:
                all_products[pid] = p

print(f'Unique products: {len(all_products)}')

with open(os.path.join(output_dir, 'cm_all_products.json'), 'w') as fp:
    json.dump(list(all_products.values()), fp, indent=2)
print('Saved to cm_all_products.json')
"

