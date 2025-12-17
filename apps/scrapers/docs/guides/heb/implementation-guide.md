# HEB Shopping List Implementation Guide

## Overview

Based on the real GraphQL response you provided, we now have:
- ✅ **Real operation name**: `getShoppingListV2`
- ✅ **Product location data**: Available in `productLocation.location`
- ✅ **SKU/UPC data**: Available in `SKUs[].twelveDigitUPC`
- ✅ **Working client**: Updated with real query structure

## What We've Built

### 1. Updated GraphQL Client (`heb_graphql_client.py`)
- Real `getShoppingListV2` query
- Proper CSRF header handling
- Ready for authentication (cookies)

### 2. Shopping Optimizer (`heb_shopping_optimizer.py`)
- Parses location strings (e.g., "Aisle 3", "In Dairy on the Left Wall")
- Extracts aisle numbers, areas, and sections
- Optimizes shopping order by location
- Generates shopping path with stops

### 3. SKU Importer (`heb_sku_importer.py`)
- Loads SKUs from CSV
- Adds items to shopping list (needs mutation discovery)
- Generates optimized paths

## Location Data Analysis

From your response, location formats include:

1. **Aisle Numbers**: `"Aisle 3"`, `"Aisle 49"`, `"Aisle 50"`
2. **Area + Section**: 
   - `"In Dairy on the Left Wall"`
   - `"In Meat Market on the Back Wall"`
   - `"In Produce on the Right Wall"`
   - `"In Deli on the Floor Display"`
3. **Special Locations**:
   - `"On the Left Edge of Bakery"`
   - `"In Produce"` (general)

## Next Steps

### Step 1: Test with Your Data

Save your GraphQL response to a file and test:

```bash
# Save your response to response.json, then:
python test_heb_optimizer.py response.json
```

This will:
- Extract all items
- Parse locations
- Optimize shopping order
- Generate a shopping path
- Export to CSV

### Step 2: Add Authentication

To use the client with your account:

1. **Get cookies from browser:**
   - Open HEB.com and log in
   - Open DevTools → Application → Cookies
   - Copy all cookies

2. **Use in Python:**
```python
from heb_graphql_client import HEBGraphQLClient

client = HEBGraphQLClient()
client.session.headers['Cookie'] = 'your-cookies-here'

response = client.get_shopping_list_v2('your-list-id')
```

### Step 3: Discover Add Items Mutation

To add SKUs to a list, we need to find the mutation:

1. **In browser DevTools:**
   - Add an item to a shopping list
   - Find the GraphQL mutation in Network tab
   - Copy the mutation structure

2. **Update `heb_graphql_client.py`:**
   - Add the real `addItemsToShoppingList` mutation
   - Test with your account

### Step 4: Build SKU Import Workflow

Once mutation is discovered:

```bash
# Create CSV with SKUs
echo "sku,quantity" > skus.csv
echo "071314051286,1" >> skus.csv
echo "072250024730,2" >> skus.csv

# Import to list
python heb_sku_importer.py \
    --list-id "your-list-id" \
    --skus skus.csv \
    --cookies "your-cookies" \
    --optimize \
    --export-csv shopping_list.csv \
    --export-path path.txt
```

## Location Optimization Strategy

The optimizer uses this strategy:

1. **Aisle items first**: Sorted by aisle number (3, 4, 5, 7, 9, 10, 30, 49, 50...)
2. **Special locations by area**: Grouped by area (Produce, Deli, Meat Market, Dairy, etc.)
3. **Area priority**: Produce → Deli → Meat Market → Dairy → Frozen → Pantry

This creates a logical flow through the store.

## Example Output

```
OPTIMIZED SHOPPING PATH
============================================================
Total Items: 55
Total Quantity: 62
Stops: 12

Stop 1: Aisle 3
  Items: 5
  [✓] Aunt Millies White Slider Buns (qty: 1)
  [✓] Family Style Hamburger Buns (qty: 1)
  ...

Stop 2: Aisle 4
  Items: 1
  [✓] H-E-B 100% Real Crumbled Bacon Pieces (qty: 1)
  ...

Stop 3: Produce
  Items: 10
  [✓] Fresh Celery Stalk (qty: 1)
  ...

Aisles to visit: 3, 4, 5, 7, 9, 10, 30, 49, 50
Areas to visit: Dairy, Deli, Meat Market, Produce
```

## Limitations & Notes

1. **No Store Layout Data**: We don't have a store map, so optimization is based on:
   - Aisle numbers (assumed sequential)
   - Area groupings (assumed proximity)
   - Common grocery store layouts

2. **App May Have Better Logic**: The HEB app likely has:
   - Store-specific layout data
   - Distance calculations
   - More sophisticated pathfinding

3. **Location Format Variations**: Different stores may format locations differently

## Future Enhancements

1. **Store Layout Database**: Build a database of store layouts
2. **Distance Calculation**: Calculate actual walking distances
3. **Multiple Store Support**: Handle different store layouts
4. **Real-time Updates**: Sync with app for live updates
5. **Path Visualization**: Generate visual shopping map

## Testing

To test with your actual data:

1. Save your GraphQL response JSON to a file
2. Run: `python test_heb_optimizer.py your_response.json`
3. Review the optimized output
4. Compare with app's ordering

## Questions?

- **Different location formats?** Update `parse_location()` in `heb_shopping_optimizer.py`
- **Different optimization strategy?** Modify `optimize_shopping_order()`
- **Need different export format?** Add new export functions

The foundation is ready - now we just need to discover the "add items" mutation to complete the workflow!

