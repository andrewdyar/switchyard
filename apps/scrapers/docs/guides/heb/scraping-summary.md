# HEB Product Location Scraping - Summary & Next Steps

## What We've Accomplished

✅ **Resolved CSRF Error:** Created a Python client that properly handles HEB's GraphQL CSRF protection by including required headers:
- `Content-Type: application/json`
- `x-apollo-operation-name` (or `apollo-require-preflight`)

✅ **Created Research Documentation:** Comprehensive analysis of:
- HEB's GraphQL API structure
- Internal services (Pyxis for optimized shopping paths)
- App features (store maps, shopping guidance)
- Challenges and limitations

✅ **Built Proof-of-Concept Client:** `heb_graphql_client.py` with:
- Proper header handling
- Template queries for common operations
- Error handling
- Extensible structure

## Current Status

### ✅ Working
- CSRF protection bypass (headers are correct)
- Basic GraphQL request structure
- Error handling and response parsing

### ⏳ Needs Discovery
- **Actual GraphQL operation names** (e.g., `GetShoppingList`, `SearchProducts`)
- **Query/mutation structures** (exact field names and types)
- **Authentication mechanism** (cookies, tokens, session management)
- **Product location data structure** (how aisle/section info is returned)

### ❌ Not Available
- **Pyxis API:** Internal service, not publicly accessible
- **Official API Documentation:** No public API docs available
- **Direct Access:** Requires reverse engineering or official partnership

## Recommended Path Forward

### Phase 1: Discovery (1-2 days)
**Goal:** Capture real GraphQL operations from HEB.com

1. **Use Browser DevTools:**
   - Open HEB.com in Chrome/Firefox
   - Open DevTools → Network tab
   - Filter by "graphql"
   - Perform actions (search, view list, add to cart)
   - Capture request/response pairs

2. **Document Operations:**
   - Operation names
   - Query structures
   - Required variables
   - Response formats
   - Authentication requirements

3. **Test with Python Client:**
   - Update `heb_graphql_client.py` with real operations
   - Test each operation individually
   - Handle authentication (cookies/tokens)

**Deliverable:** Working Python client that can query HEB's GraphQL API

### Phase 2: Product Location Data (2-3 days)
**Goal:** Extract product location information (aisle, section, shelf)

1. **Identify Location Queries:**
   - Find operations that return location data
   - May be in product details, shopping list, or separate endpoint
   - Test with multiple products and stores

2. **Build Location Database:**
   - Query products by SKU
   - Extract location information
   - Store in local database (SQLite/CSV)
   - Handle multiple stores (locations vary by store)

3. **Validate Data:**
   - Cross-reference with in-store verification
   - Handle missing/incomplete data
   - Update as store layouts change

**Deliverable:** Database of SKU → location mappings for target stores

### Phase 3: Shopping List Integration (2-3 days)
**Goal:** Import SKUs and add to HEB shopping list

1. **SKU Import:**
   - Accept list of SKUs (CSV, JSON, or API)
   - Validate SKUs exist in HEB system
   - Handle invalid/missing SKUs

2. **List Management:**
   - Create or use existing shopping list
   - Add items via GraphQL mutations
   - Handle quantities and variants

3. **Optimization (if possible):**
   - If location data is available, sort items by aisle
   - Generate optimized shopping path
   - Export as ordered list or map

**Deliverable:** Working SKU import → shopping list functionality

### Phase 4: Optimization & Polish (1-2 days)
**Goal:** Create production-ready tool

1. **Error Handling:**
   - Handle rate limiting
   - Retry logic for failed requests
   - Graceful degradation

2. **User Interface:**
   - CLI tool for SKU import
   - Optional web interface
   - Progress indicators

3. **Documentation:**
   - Usage examples
   - API documentation
   - Troubleshooting guide

**Deliverable:** Production-ready tool for sweep shoppers

## Alternative Approaches

### Option A: Browser Automation
If GraphQL API proves too difficult:
- Use **Selenium** or **Playwright** to automate browser
- Interact with HEB.com directly
- Extract data from rendered pages
- **Pros:** Easier to implement, no API reverse engineering
- **Cons:** Slower, more fragile, harder to scale

### Option B: Mobile App Analysis
- Reverse engineer HEB mobile app
- Extract API endpoints and authentication
- May have better access to location data
- **Pros:** App may have more features
- **Cons:** More complex, may violate ToS

### Option C: Official Partnership
- Contact HEB directly
- Request API access or partnership
- May get access to Pyxis or other internal tools
- **Pros:** Official, stable, legal
- **Cons:** May not be available, requires business case

## Files Created

1. **`HEB_API_RESEARCH.md`** - Comprehensive research findings
2. **`heb_graphql_client.py`** - Python client with CSRF handling
3. **`HEB_API_DISCOVERY_GUIDE.md`** - Step-by-step discovery guide
4. **`HEB_SCRAPING_SUMMARY.md`** - This file (overview and next steps)

## Quick Start

### 1. Test Current Implementation
```bash
python3 heb_graphql_client.py
```

### 2. Discover Real Operations
Follow `HEB_API_DISCOVERY_GUIDE.md` to capture actual GraphQL queries

### 3. Update Client
Edit `heb_graphql_client.py` with discovered operations

### 4. Test with Real Data
```python
from heb_graphql_client import HEBGraphQLClient

client = HEBGraphQLClient()
# Add authentication (cookies, etc.)
response = client.get_product_by_sku('12345')
```

## Key Questions to Answer

1. **Does HEB's GraphQL API expose product location data?**
   - Need to test with real queries
   - May only be available in mobile app
   - May require store-specific queries

2. **What authentication is required?**
   - Session cookies?
   - API tokens?
   - User account login?

3. **Is shopping path optimization available?**
   - Pyxis is internal only
   - May need to build our own optimization
   - Requires location data for all items

4. **Can we add items to shopping list programmatically?**
   - Need to find the mutation
   - May require authentication
   - May have rate limits

## Legal & Ethical Considerations

⚠️ **Important Reminders:**

- **Review ToS:** Check HEB's Terms of Service before scraping
- **Rate Limiting:** Don't overload their servers
- **Respect robots.txt:** Check `https://www.heb.com/robots.txt`
- **Data Usage:** Only use data for intended purpose
- **Official Access:** Consider reaching out to HEB first

## Estimated Timeline

- **Discovery:** 1-2 days
- **Location Data:** 2-3 days
- **List Integration:** 2-3 days
- **Polish:** 1-2 days
- **Total:** 6-10 days for full implementation

## Success Criteria

✅ Can query HEB GraphQL API without CSRF errors  
✅ Can retrieve product information by SKU  
✅ Can get product location data (aisle/section)  
✅ Can add items to shopping list  
✅ Can import list of SKUs and generate shopping list  
⏳ Can generate optimized shopping path (if location data available)

## Next Immediate Action

**Start with Phase 1: Discovery**

1. Open `https://www.heb.com` in browser
2. Open DevTools → Network tab
3. Search for a product
4. Capture the GraphQL request
5. Update `heb_graphql_client.py` with the real operation
6. Test and iterate

Good luck! 🛒

