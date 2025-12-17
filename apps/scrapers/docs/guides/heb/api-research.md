# HEB GraphQL API Research

## Executive Summary

This document outlines research findings on accessing HEB's GraphQL API for product location information and shopping list optimization. The goal is to enable importing SKUs and generating optimized shopping paths for in-store pickup.

## Findings

### 1. GraphQL Endpoint

**Endpoint:** `https://www.heb.com/graphql`

**CSRF Protection:** The endpoint implements Apollo GraphQL CSRF protection, requiring specific headers to prevent unauthorized access.

### 2. Required Headers

To bypass the CSRF error, requests must include:

1. **Content-Type:** `application/json` (or any type that is NOT one of: `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`)

2. **At least one of:**
   - `x-apollo-operation-name`: A non-empty value (typically the GraphQL operation name)
   - `apollo-require-preflight`: A non-empty value (triggers preflight request)

### 3. Example Request Structure

```http
POST https://www.heb.com/graphql HTTP/1.1
Content-Type: application/json
x-apollo-operation-name: GetShoppingList
apollo-require-preflight: true

{
  "query": "query GetShoppingList { ... }",
  "variables": {}
}
```

### 4. Internal Services

**Pyxis:** HEB has an internal service called "Pyxis" that provides optimized shopping paths through stores. This service:
- Takes a starting point, ending point, and list of products
- Returns the most efficient path through the store
- Was originally developed for Curbside personal shoppers
- **Status:** Internal use only, not publicly accessible

**Reference:** [HEB Careers Blog - Shopping Smarter with Sequencing Services](https://careers.heb.com/blog/shopping-smarter-with-sequencing-services)

### 5. App Features

The HEB mobile app includes:
- **Store Maps:** Pinpoint item locations down to the aisle level
- **Shopping Guidance:** Optimized order for shopping items in a list
- **In-Store Mode:** Features activate when app is set to "in-store" shopping

**Reference:** [HEB Facebook Post - Store Map Feature](https://www.facebook.com/HEB/posts/start-using-the-my-h-e-b-app-store-map-to-pinpoint-your-items-location-down-to-t/934417848720950/)

### 6. Third-Party Tools

**HEB Grocery Agent (Chrome Extension):**
- Automates HEB grocery shopping
- Cleans up shopping lists
- Adds items to cart
- Claims to save up to 70% of shopping time
- **Note:** This may provide insights into API usage patterns

## Challenges & Limitations

### 1. Authentication
- The GraphQL API likely requires authentication (session cookies, tokens, etc.)
- Without valid credentials, even with correct headers, requests may fail
- Authentication may be tied to user accounts or app sessions

### 2. Operation Names
- GraphQL operations have specific names (e.g., `GetShoppingList`, `GetProductLocation`)
- These operation names must be discovered through:
  - Reverse engineering the web app
  - Inspecting network requests in browser DevTools
  - Analyzing the mobile app (if possible)

### 3. Rate Limiting
- The API likely implements rate limiting
- Excessive requests may result in IP blocking (as seen with Incapsula protection)

### 4. Terms of Service
- Scraping may violate HEB's Terms of Service
- Consider reaching out to HEB for official API access or partnership

## Recommended Approach

### Phase 1: Proof of Concept
1. ✅ Set up proper headers (Content-Type, x-apollo-operation-name)
2. ✅ Test basic GraphQL query structure
3. ⏳ Discover operation names through browser DevTools
4. ⏳ Identify authentication requirements

### Phase 2: Discovery
1. Monitor network requests in browser while using HEB.com
2. Capture GraphQL queries for:
   - Product search
   - Shopping list operations
   - Store location queries
   - Product location/aisle information
3. Document query structures and variables

### Phase 3: Implementation
1. Build a Python client that:
   - Handles authentication (if possible)
   - Makes GraphQL requests with proper headers
   - Parses responses for product location data
2. Create SKU import functionality
3. Generate optimized shopping paths (if location data is available)

### Phase 4: Alternative Approaches
If direct API access proves difficult:
1. **Contact HEB:** Inquire about official API access or partnership opportunities
2. **Browser Automation:** Use Selenium/Playwright to interact with the website
3. **Mobile App Analysis:** Reverse engineer the mobile app to understand API calls
4. **Hybrid Approach:** Combine web scraping with manual data collection

## Next Steps

1. **Immediate:** Test GraphQL requests with proper headers (see `heb_graphql_client.py`)
2. **Short-term:** Use browser DevTools to capture actual GraphQL operations
3. **Medium-term:** Build a working prototype for SKU import and location lookup
4. **Long-term:** Explore partnership with HEB or alternative data sources

## References

- [Apollo GraphQL CSRF Protection](https://www.apollographql.com/docs/graphos/routing/security/csrf)
- [HEB Careers - Pyxis Service](https://careers.heb.com/blog/shopping-smarter-with-sequencing-services)
- [HEB Facebook - Store Map Feature](https://www.facebook.com/HEB/posts/start-using-the-my-h-e-b-app-store-map-to-pinpoint-your-items-location-down-to-t/934417848720950/)

## Legal & Ethical Considerations

⚠️ **Important:** Before proceeding with any scraping or API access:
- Review HEB's Terms of Service and robots.txt
- Consider rate limiting and respectful usage
- Explore official API options first
- Be transparent about data usage
- Consider reaching out to HEB for official access

