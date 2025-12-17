#!/bin/bash
# Small test script for HEB product scraper with Supabase

echo "🧪 Running small HEB product scraper test with Supabase"
echo ""
echo "📋 Test parameters:"
echo "   - Store ID: 202"
echo "   - Strategy: search only"
echo "   - Search terms: 3 terms (milk, bread, eggs)"
echo "   - Rate limit: 1.0 seconds"
echo ""
echo "⚠️  Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set!"
echo ""

python3 heb_product_scraper.py \
  --store-id 202 \
  --strategy search \
  --rate-limit 1.0 \
  --limit-terms 3 \
  --cookies "$HEB_COOKIES"

