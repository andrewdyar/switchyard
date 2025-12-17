# HEB Product Scraping Strategy

## Overview

This document outlines a systematic approach to scraping all products from HEB's GraphQL API.

## Challenges & Approach

### 1. Discovery Problem
**Challenge:** HEB doesn't provide a simple "list all products" endpoint.

**Solution:** Multi-pronged approach:
- **Category-based scraping**: Iterate through HEB's category/department structure
- **Search-based discovery**: Use common grocery search terms
- **Incremental ID discovery**: Try sequential product IDs (risky, slow)

### 2. GraphQL Query Discovery

**Current Status:** We know the structure from shopping list queries, but need to discover:
- Product search query structure
- Category browsing query structure
- Pagination format
- Filter options

**Next Steps:**
1. Use browser DevTools to capture actual search queries
2. Test with `heb_graphql_client.py`
3. Document query structures and hashes

### 3. Rate Limiting & Ethics

**Rate Limiting:**
- Add delays between requests (0.5-1 second recommended)
- Respect HTTP 429 (Too Many Requests) responses
- Implement exponential backoff
- Use connection pooling for efficiency

**Ethics:**
- Respect HEB's Terms of Service
- Don't overload their servers
- Consider reaching out for official API access
- Use scraped data responsibly

## Implementation Strategy

### Phase 1: Query Discovery (Manual)

1. **Capture Search Query:**
   - Open HEB.com in browser
   - Open DevTools → Network tab
   - Search for a product (e.g., "milk")
   - Find GraphQL request
   - Copy: operation name, query, variables, hash

2. **Capture Category Query:**
   - Browse to a category page (e.g., Produce)
   - Find GraphQL request for category products
   - Copy structure

3. **Update `heb_product_scraper.py`:**
   - Replace template queries with real ones
   - Add persisted query hashes
   - Test with known products

### Phase 2: Category Discovery

**Option A: Parse Website Navigation**
- Scrape HEB.com navigation menu
- Extract category links and IDs
- Build category tree

**Option B: Use Known Categories**
- Start with common grocery categories
- Expand as we discover more

**Option C: API Discovery**
- Check if HEB has a categories/endpoint
- Query for category listing

### Phase 3: Systematic Scraping

**Strategy 1: Category-Based (Recommended)**
```
For each category:
  1. Get first page of products (page=0, size=50)
  2. Extract all product IDs
  3. Store in Supabase
  4. Check pagination (hasMore, totalPages)
  5. If more pages, increment page number
  6. Repeat until no more pages
  7. Move to next category
```

**Strategy 2: Search-Based (Complementary)**
```
For each search term:
  1. Search with term
  2. Extract all product IDs
  3. Store in Supabase (deduplication by ID)
  4. Handle pagination
  5. Use broad terms to discover products
```

**Strategy 3: Hybrid (Most Complete)**
```
1. Start with category-based scraping (structure)
2. Fill gaps with search-based discovery
3. Use incremental ID attempts for missing ranges (optional)
```

## Product Data Structure

Based on shopping list queries, HEB products have:
- `id`: Product ID (e.g., "325173")
- `fullDisplayName`: Product name
- `thumbnailImageUrl`: Product image
- `productImageUrls[]`: Array of image URLs with sizes
- `SKUs[]`: Array of SKUs with:
  - `id`: SKU ID
  - `twelveDigitUPC`: UPC code
  - `customerFriendlySize`: Size description
  - `price`: Pricing info
- `productLocation`: Store location (aisle, section)
- `category`: Category information

## Storage in Supabase

### Database Schema

Products will be stored in:
1. **`products`** table (master product)
   - Normalize product names (remove store prefixes)
   - Store master image URL

2. **`product_store_mappings`** table (store-specific)
   - `store_name`: "heb"
   - `store_item_id`: HEB product ID
   - `store_item_name`: Full HEB product name
   - `store_image_url`: HEB image URL

3. **`product_pricing`** table
   - Current price from HEB
   - Store name: "heb"

4. **`categories`** table
   - HEB categories mapped to our categories

### Deduplication

- Products are deduplicated by HEB product ID
- Multiple SKUs of same product = one master product with multiple mappings
- Updates existing products if found (updates prices, images)

## Recommended Search Terms

### High-Value Terms (Broad Coverage)
- Single letters: a, b, c, ..., z
- Numbers: 1, 2, 3, ..., 9
- Common words: "the", "and", "or"

### Category Terms
- Produce: apple, banana, lettuce, tomato
- Meat: chicken, beef, pork, fish
- Dairy: milk, cheese, yogurt, butter
- Pantry: pasta, rice, canned, soup
- Frozen: ice cream, pizza, vegetables
- Beverages: water, soda, juice, coffee
- Snacks: chips, cookies, crackers
- Bakery: bread, bagels, donuts
- Deli: deli, sandwich, prepared

### Brand Terms
- H-E-B (store brand)
- Hill Country Fare (store brand)
- Other major brands

## Execution Plan

### Step 1: Manual Query Discovery
```bash
# 1. Use browser to capture search query
# 2. Test query with heb_graphql_client.py
# 3. Update heb_product_scraper.py with real queries
```

### Step 2: Test with Single Category
```bash
python heb_product_scraper.py --strategy categories --cookies "$HEB_COOKIES"
```

### Step 3: Full Category Scrape
```bash
# Scrape all categories
python heb_product_scraper.py --strategy categories \
  --cookies "$HEB_COOKIES" \
  --rate-limit 1.0
```

### Step 4: Search-Based Discovery
```bash
# Fill gaps with search
python heb_product_scraper.py --strategy search \
  --cookies "$HEB_COOKIES" \
  --rate-limit 0.5
```

### Step 5: Hybrid Approach
```bash
# Combine both strategies
python heb_product_scraper.py --strategy both \
  --cookies "$HEB_COOKIES" \
  --rate-limit 0.5
```

## Monitoring & Logging

The scraper logs:
- Products scraped per category/term
- Failed requests
- Total counts
- Timing information

Monitor for:
- 429 (Rate Limit) errors → increase delay
- 401 (Unauthorized) errors → update cookies
- Empty results → category/term doesn't exist
- Duplicate products → deduplication working

## Expected Results

### Realistic Expectations
- **HEB has ~50,000-100,000 products**
- **Category-based scraping**: ~40,000-80,000 products
- **Search-based discovery**: ~10,000-20,000 additional
- **Time to scrape**: 2-4 hours (with rate limiting)
- **Database size**: ~100-200 MB

### Success Metrics
- ✅ Products scraped: >50,000
- ✅ Categories covered: All major departments
- ✅ Images downloaded: >90% success rate
- ✅ Pricing data: >80% has prices
- ✅ Location data: >60% has store locations

## Next Steps

1. **Discover actual GraphQL queries** (manual browser capture)
2. **Test scraper with known products** (validate structure)
3. **Run category-based scrape** (primary method)
4. **Run search-based scrape** (fill gaps)
5. **Verify data quality** (check Supabase)
6. **Optimize and repeat** (improve coverage)

## Troubleshooting

### "Query failed" errors
- Check cookies are valid
- Verify query structure matches actual API
- Check rate limiting isn't too aggressive

### "No products found"
- Category/term might not exist
- Query structure might be wrong
- Try different category/term

### "Duplicate product" errors
- Deduplication is working
- Expected behavior
- Check if it's actually duplicate or different variant

### Rate limiting issues
- Increase `--rate-limit` delay
- Add exponential backoff
- Consider using multiple sessions/IPs (carefully)

---

**Status:** ⏳ Awaiting GraphQL query discovery  
**Priority:** High - Need to capture actual API queries first



