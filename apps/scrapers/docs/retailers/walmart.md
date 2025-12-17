# Walmart

## API Overview
- **Type**: GraphQL (Orchestra)
- **Base URL**: `https://www.walmart.com/orchestra/`
- **Authentication**: Cookie-based session
- **Rate Limiting**: Aggressive bot detection

## Endpoints

### Category/Search
- **URL Pattern**: `POST https://www.walmart.com/orchestra/home/graphql/search`
- **Key Parameters**:
  - `query`: Search text
  - `stores`: Store ID
  - `sort`: `best_match`, `price_low`, `price_high`
  - `page`: Page number

### Product Detail (PDP)
- **URL Pattern**: `POST https://www.walmart.com/orchestra/pdp/graphql/ItemByIdBtf/{hash}/ip/{item_id}`
- **Key Parameters**:
  - `item_id`: Walmart item ID (in URL path)

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `usItemId` | `external_id` | Walmart item ID |
| `upc` | `barcode` | 12-digit UPC (PDP only) |
| `name` | `name` | Product name |
| `brand` | `brand` | Brand name |
| `priceInfo.currentPrice.price` | `cost_price` | Current price |
| `priceInfo.unitPrice.priceString` | `price_per_unit` | e.g., "$1.47/lb" |
| `productLocation[].displayValue` | `store_location` | Aisle (e.g., "A12") |
| `productLocation[].aisle.zone` | `store_zone` | Zone letter |
| `productLocation[].aisle.aisle` | `store_aisle` | Aisle number |

## In-Store Location Structure

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

## Python Example

```python
def extract_walmart_product(item: dict) -> dict:
    """Extract product data from Walmart response."""
    price_info = item.get('priceInfo', {})
    location = item.get('productLocation', [{}])[0] if item.get('productLocation') else {}
    
    return {
        'external_id': item.get('usItemId'),
        'barcode': item.get('upc'),
        'name': item.get('name'),
        'brand': item.get('brand'),
        'cost_price': price_info.get('currentPrice', {}).get('price'),
        'store_location': location.get('displayValue'),
        'store_zone': location.get('aisle', {}).get('zone'),
        'store_aisle': location.get('aisle', {}).get('aisle'),
    }
```

## Category Mapping

Walmart uses a hierarchical category structure with subcategories nested under top-level categories. Each subcategory maps to exactly one Goods category/subcategory. Products in subcategories that don't fit the Goods taxonomy are excluded.

### Mapping Strategy

- **Subcategory-level mapping**: Only subcategories are mapped (not top-level categories)
- **One-to-one mapping**: Each Walmart subcategory maps to exactly one Goods category/subcategory
- **Exclusions**: Subcategories that don't fit Goods taxonomy are excluded (products in these subcategories will be deleted)

### Complete Subcategory Mapping

The following table shows all Walmart subcategories mapped to Goods categories:

| Walmart Subcategory | Goods Category | Goods Subcategory | Category ID | Subcategory ID |
|---------------------|----------------|------------------|-------------|----------------|
| Fresh Fruits | produce | fruit | 976793 | 9756351 |
| Fresh Vegetables | produce | vegetables | 976793 | 8910423 |
| Fresh Herbs | produce | fresh_herbs | 976793 | 3513831 |
| Organic Produce | produce | *none* | 976793 | 1913529 |
| Cut Fruits & Vegetables | produce | *none* | 976793 | 8402496 |
| Salad Kits & Bowls | produce | vegetables | 9538337 | *none* |
| Fresh Dressings | pantry | condiments | 976793 | 9538337 |
| Salsa & Dips | pantry | condiments | 976793 | 9538337 |
| Plant-based Protein & Tofu | meat_seafood | plant_based | 976793 | 6919650 |
| Beef & Lamb | meat_seafood | beef | 9569500 | 1730435 |
| Pork | meat_seafood | pork | 9569500 | 1044143 |
| Chicken | meat_seafood | poultry | 9569500 | 1001443 |
| Bacon, Hot Dogs, & Sausage | meat_seafood | pork | 9569500 | 2941132 |
| Organic and Plant-Based | meat_seafood | plant_based | 9569500 | 5574987 |
| The Seafood Shop | meat_seafood | seafood | 3410728 | *none* |
| The Beef Shop | meat_seafood | beef | 6677247 | *none* |
| The Pork Shop | meat_seafood | pork | 2543738 | *none* |
| Deli Meat & Cheese | dairy_eggs | cheese | 976789 | 5428795 |
| Specialty Cheese and Charcuterie | dairy_eggs | cheese | *none* | *none* |
| Rotisserie Chicken | meat_seafood | poultry | 9569500 | 1001443 |
| Hummus, Dips & Salsa | pantry | condiments | 976789 | 7056897 |
| Chips | snacks | chips | 1001390 | *none* |
| Crackers | snacks | crackers | 976787 | 1001392 |
| Cookies | snacks | candy | 1001391 | *none* |
| Fruit Snacks | snacks | candy | 976787 | 1001395 |
| Popcorn | snacks | chips | 976787 | 1001407 |
| Pretzels | snacks | crackers | 976787 | 1044156 |
| Salsas & Dips | pantry | condiments | 976787 | 1001393 |
| Canned Goods | pantry | canned_goods | 976794 | 7433209 |
| Condiments | pantry | condiments | 976794 | 7981173 |
| Pasta & Pizza | pantry | pasta_rice | 976794 | 5403011 |
| Herbs, spices, seasonings | pantry | condiments | 976794 | 3029941 |
| Soup | pantry | canned_goods | 976794 | 8248961 |
| Rice, grains, dried beans | pantry | pasta_rice | 976794 | 4879140 |
| Soda | beverages | soda | 1001680 | *none* |
| Water | beverages | water | 1001659 | *none* |
| Juices | beverages | juice | 1001321 | *none* |
| Sports Drinks | beverages | soda | 976782 | 1001682 |
| Kids Drinks & Juice Boxes | beverages | juice | 976782 | 1001321 |
| Coffee | beverages | coffee_tea | 1086446 | *none* |
| Tea | beverages | coffee_tea | 1001320 | *none* |
| Energy Drinks | beverages | soda | 976782 | 9357528 |
| Drink Mixes | beverages | *none* | 976782 | 1001683 |
| Bottled Tea | beverages | coffee_tea | 976782 | 1001320 |
| Tea Bags | beverages | coffee_tea | 976782 | 1001320 |
| Sweet Tea | beverages | coffee_tea | 976782 | 1001320 |
| Iced Tea & Mixes | beverages | coffee_tea | 976782 | 1001320 |
| Green Tea | beverages | coffee_tea | 976782 | 1001320 |
| Herbal Tea | beverages | coffee_tea | 976782 | 1001320 |
| Tea Lattes | beverages | coffee_tea | 976782 | 1001320 |
| Decaf Tea | beverages | coffee_tea | 976782 | 1001320 |
| Cold Brew Tea | beverages | coffee_tea | 976782 | 1001320 |
| Loose Leaf Tea | beverages | coffee_tea | 976782 | 1001320 |
| Black Tea | beverages | coffee_tea | 976782 | 1001320 |
| Matcha Tea | beverages | coffee_tea | 976782 | 1001320 |
| Tea K-Cups | beverages | coffee_tea | 976782 | 1001320 |
| Boba Tea | beverages | coffee_tea | 976782 | 1001320 |
| Digestion Tea | beverages | coffee_tea | 976782 | 1001320 |
| Immunity Tea | beverages | coffee_tea | 976782 | 1001320 |
| Energy Tea | beverages | coffee_tea | 976782 | 1001320 |
| Detox Tea | beverages | coffee_tea | 976782 | 1001320 |
| Relaxation | beverages | coffee_tea | 976782 | 1001320 |
| Great Value Tea | beverages | coffee_tea | 976782 | 1001320 |
| Ship to Home Coffee | beverages | coffee_tea | 1086446 | 6683788 |
| K-Cups & Coffee Pods | beverages | coffee_tea | 1086446 | 1229653 |
| Ground Coffee | beverages | coffee_tea | 1086446 | 2174088 |
| Whole Bean Coffee | beverages | coffee_tea | 1086446 | 1229652 |
| Instant Coffee | beverages | coffee_tea | 1086446 | 1229650 |
| Bottled Coffee | beverages | coffee_tea | 1086446 | 1229654 |
| Cold Brew Coffee | beverages | coffee_tea | 1086446 | 1229654 |
| Espresso Pods | beverages | coffee_tea | 1086446 | 7775574 |
| Great Value Coffee | beverages | coffee_tea | 1086446 | 4168978 |
| Coffee Creamers | dairy_eggs | *none* | 9176907 | 9550303 |
| Sugars & Sweetners | pantry | baking | 976780 | 9959366 |
| Flavored Syrups | pantry | condiments | 1086446 | 9241711 |
| Non Alcoholic Drinks | beverages | *none* | 4158159 | *none* |
| Cereal & Granola | pantry | *none* | 976783 | 8102529 |
| Oatmeal & Grits | pantry | pasta_rice | 976783 | 7830606 |
| Breakfast Breads | bakery | bread | 976779 | 1044115 |
| Toaster Pastries & Bars | bakery | pastries | 976783 | 8438428 |
| Pancakes & Waffles & Syrup | pantry | baking | 976783 | 2228922 |
| Muffins & Pastries | bakery | pastries | 9392773 | 8196081 |
| Artisan Bread | bakery | bread | 976779 | 3396508 |
| Bread | bakery | bread | 976779 | 8399244 |
| Pastries | bakery | pastries | 976779 | 1001456 |
| Rolls | bakery | bread | 976779 | 1037480 |
| Buns | bakery | bread | 976779 | 5829009 |
| Bakery Cookies | snacks | candy | 976779 | 1951361 |
| Brownies | bakery | pastries | 976779 | 3465538 |
| Bakery Sweets | bakery | pastries | 976779 | 4525853 |
| Pies | bakery | pastries | 976779 | 2464018 |
| Cakes | bakery | pastries | 976779 | 9997386 |
| Cupcakes | bakery | pastries | 976779 | 2408821 |
| Tortillas | bakery | tortillas | 976779 | 2993335 |
| Snack Cakes | bakery | pastries | 976779 | 9318357 |
| Cheese | dairy_eggs | cheese | 9176907 | 1001468 |
| Milk | dairy_eggs | milk | 9176907 | 4405816 |
| Cream & Creamers | dairy_eggs | milk | 9176907 | 9550303 |
| Yogurt | dairy_eggs | yogurt | 9176907 | 1001470 |
| Eggs | dairy_eggs | eggs | 9176907 | 1001469 |
| Butter & Margarine | dairy_eggs | butter | 9176907 | 1001467 |
| Sour Cream & Chilled Dips | dairy_eggs | *none* | 9176907 | 7287191 |
| Biscuits, Cookies, Doughs & Crusts | bakery | bread | 9176907 | 7545972 |
| Pudding & Gelatin | dairy_eggs | *none* | 9176907 | 3733198 |
| Ice Cream & Novelties | frozen | ice_cream | 976791 | 1518625 |
| The Ice Cream Shop | frozen | ice_cream | 1439236 | *none* |
| Frozen Meals | frozen | frozen_meals | 976791 | 6259087 |
| Frozen Appetizers & Snacks | frozen | frozen_meals | 976791 | 1272219 |
| Frozen Produce | frozen | frozen_produce | 976791 | 5624760 |
| Frozen Breakfast | frozen | frozen_meals | 976791 | 1001417 |
| Frozen Pizza | frozen | frozen_meals | 976791 | 2072073 |
| Frozen Desserts | frozen | ice_cream | 976791 | 9551235 |
| Frozen Meat, Seafood, & Vegetarian | frozen | frozen_meals | 976791 | 5295075 |
| Frozen Potatoes | frozen | frozen_produce | 976791 | 6170090 |
| Chocolate | snacks | candy | 1096070 | 1224976 |
| Gummy & chewy candy | snacks | candy | 1096070 | 1224975 |
| Hard candy & lollipops | snacks | candy | 1096070 | 1224979 |
| Multipacks & bags | snacks | candy | 1096070 | 1224980 |
| Gum | snacks | candy | 1096070 | 1224977 |
| Mints | snacks | candy | 1096070 | 1224978 |
| Better for you | snacks | candy | 1096070 | 2851671 |
| Baking Mixes | pantry | baking | 976780 | 6314071 |
| Sugars & Sweeteners | pantry | baking | 976780 | 9959366 |
| Flours & Meals | pantry | baking | 976780 | 9959366 |
| Baking Soda & Starch | pantry | baking | 976780 | 9959366 |
| Oil & Shortening | pantry | baking | 976780 | 4930324 |
| Yeasts | pantry | baking | 976780 | 9959366 |
| Baking Nuts | pantry | baking | 976780 | 9959366 |
| Canned & Powdered Milks | pantry | baking | 976780 | 9959366 |
| Baking Chocolate Chips & Cocoa | pantry | baking | 2710937 | *none* |
| Frosting & Decor | pantry | baking | 976780 | 9959366 |
| Extracts & Spices | pantry | baking | 976780 | 9959366 |
| Marshmallow | pantry | baking | 976780 | 9959366 |
| Top Baking Brands | pantry | baking | 976780 | 4879413 |

### Excluded Subcategories

The following subcategories are excluded from the Goods taxonomy (products in these subcategories will be deleted):

- **Flowers** - Not in Goods taxonomy
- **The Holiday Mains Shop** - Promotional category
- **Prepared meals & sides** - Prepared items don't fit well
- **Fresh Sandwiches** - Prepared items
- **Fresh Prepared Soups & Salads** - Prepared items
- **Alcohol categories** (Beer, Wine, Spirits, Hard Seltzers & Cocktails, Cocktail Mixers, Shop Drinks for the Holidays) - Not in Goods taxonomy
- **Coffee Makers, Espresso Machines, Coffee Filters, Coffee Mugs** - Not food items
- **Custom Bakery Cakes** - Custom orders
- **Promotional categories** (Only at Walmart, EBT/SNAP eligible, Exclusively online, Grab n Go, As seen on TV, etc.) - Promotional/marketing categories
- **Non-food items** (Batteries, Gift cards, Electronics, Toys, Kitchen items, Health and beauty, Fitness and exercise, Tools, Pets) - Not in Goods taxonomy

### Python Implementation

```python
CATEGORY_MAP = {
    'Fresh Fruits': ('produce', 'fruit'),
    'Fresh Vegetables': ('produce', 'vegetables'),
    'Fresh Herbs': ('produce', 'fresh_herbs'),
    'Organic Produce': ('produce', None),
    'Cut Fruits & Vegetables': ('produce', None),
    'Salad Kits & Bowls': ('produce', 'vegetables'),
    'Fresh Dressings': ('pantry', 'condiments'),
    'Salsa & Dips': ('pantry', 'condiments'),
    'Plant-based Protein & Tofu': ('meat_seafood', 'plant_based'),
    'Beef & Lamb': ('meat_seafood', 'beef'),
    'Pork': ('meat_seafood', 'pork'),
    'Chicken': ('meat_seafood', 'poultry'),
    'Bacon, Hot Dogs, & Sausage': ('meat_seafood', 'pork'),
    'Organic and Plant-Based': ('meat_seafood', 'plant_based'),
    'The Seafood Shop': ('meat_seafood', 'seafood'),
    'The Beef Shop': ('meat_seafood', 'beef'),
    'The Pork Shop': ('meat_seafood', 'pork'),
    'Deli Meat & Cheese': ('dairy_eggs', 'cheese'),
    'Specialty Cheese and Charcuterie': ('dairy_eggs', 'cheese'),
    'Rotisserie Chicken': ('meat_seafood', 'poultry'),
    'Hummus, Dips & Salsa': ('pantry', 'condiments'),
    'Chips': ('snacks', 'chips'),
    'Crackers': ('snacks', 'crackers'),
    'Cookies': ('snacks', 'candy'),
    'Fruit Snacks': ('snacks', 'candy'),
    'Popcorn': ('snacks', 'chips'),
    'Pretzels': ('snacks', 'crackers'),
    'Salsas & Dips': ('pantry', 'condiments'),
    'Canned Goods': ('pantry', 'canned_goods'),
    'Condiments': ('pantry', 'condiments'),
    'Pasta & Pizza': ('pantry', 'pasta_rice'),
    'Herbs, spices, seasonings': ('pantry', 'condiments'),
    'Soup': ('pantry', 'canned_goods'),
    'Rice, grains, dried beans': ('pantry', 'pasta_rice'),
    'Soda': ('beverages', 'soda'),
    'Water': ('beverages', 'water'),
    'Juices': ('beverages', 'juice'),
    'Sports Drinks': ('beverages', 'soda'),
    'Kids Drinks & Juice Boxes': ('beverages', 'juice'),
    'Coffee': ('beverages', 'coffee_tea'),
    'Tea': ('beverages', 'coffee_tea'),
    'Energy Drinks': ('beverages', 'soda'),
    'Drink Mixes': ('beverages', None),
    'Bottled Tea': ('beverages', 'coffee_tea'),
    'Tea Bags': ('beverages', 'coffee_tea'),
    'Sweet Tea': ('beverages', 'coffee_tea'),
    'Iced Tea & Mixes': ('beverages', 'coffee_tea'),
    'Green Tea': ('beverages', 'coffee_tea'),
    'Herbal Tea': ('beverages', 'coffee_tea'),
    'Tea Lattes': ('beverages', 'coffee_tea'),
    'Decaf Tea': ('beverages', 'coffee_tea'),
    'Cold Brew Tea': ('beverages', 'coffee_tea'),
    'Loose Leaf Tea': ('beverages', 'coffee_tea'),
    'Black Tea': ('beverages', 'coffee_tea'),
    'Matcha Tea': ('beverages', 'coffee_tea'),
    'Tea K-Cups': ('beverages', 'coffee_tea'),
    'Boba Tea': ('beverages', 'coffee_tea'),
    'Digestion Tea': ('beverages', 'coffee_tea'),
    'Immunity Tea': ('beverages', 'coffee_tea'),
    'Energy Tea': ('beverages', 'coffee_tea'),
    'Detox Tea': ('beverages', 'coffee_tea'),
    'Relaxation': ('beverages', 'coffee_tea'),
    'Great Value Tea': ('beverages', 'coffee_tea'),
    'Ship to Home Coffee': ('beverages', 'coffee_tea'),
    'K-Cups & Coffee Pods': ('beverages', 'coffee_tea'),
    'Ground Coffee': ('beverages', 'coffee_tea'),
    'Whole Bean Coffee': ('beverages', 'coffee_tea'),
    'Instant Coffee': ('beverages', 'coffee_tea'),
    'Bottled Coffee': ('beverages', 'coffee_tea'),
    'Cold Brew Coffee': ('beverages', 'coffee_tea'),
    'Espresso Pods': ('beverages', 'coffee_tea'),
    'Great Value Coffee': ('beverages', 'coffee_tea'),
    'Coffee Creamers': ('dairy_eggs', None),
    'Sugars & Sweetners': ('pantry', 'baking'),
    'Flavored Syrups': ('pantry', 'condiments'),
    'Non Alcoholic Drinks': ('beverages', None),
    'Cereal & Granola': ('pantry', None),
    'Oatmeal & Grits': ('pantry', 'pasta_rice'),
    'Breakfast Breads': ('bakery', 'bread'),
    'Toaster Pastries & Bars': ('bakery', 'pastries'),
    'Pancakes & Waffles & Syrup': ('pantry', 'baking'),
    'Muffins & Pastries': ('bakery', 'pastries'),
    'Artisan Bread': ('bakery', 'bread'),
    'Bread': ('bakery', 'bread'),
    'Pastries': ('bakery', 'pastries'),
    'Rolls': ('bakery', 'bread'),
    'Buns': ('bakery', 'bread'),
    'Bakery Cookies': ('snacks', 'candy'),
    'Brownies': ('bakery', 'pastries'),
    'Bakery Sweets': ('bakery', 'pastries'),
    'Pies': ('bakery', 'pastries'),
    'Cakes': ('bakery', 'pastries'),
    'Cupcakes': ('bakery', 'pastries'),
    'Tortillas': ('bakery', 'tortillas'),
    'Snack Cakes': ('bakery', 'pastries'),
    'Cheese': ('dairy_eggs', 'cheese'),
    'Milk': ('dairy_eggs', 'milk'),
    'Cream & Creamers': ('dairy_eggs', 'milk'),
    'Yogurt': ('dairy_eggs', 'yogurt'),
    'Eggs': ('dairy_eggs', 'eggs'),
    'Butter & Margarine': ('dairy_eggs', 'butter'),
    'Sour Cream & Chilled Dips': ('dairy_eggs', None),
    'Biscuits, Cookies, Doughs & Crusts': ('bakery', 'bread'),
    'Pudding & Gelatin': ('dairy_eggs', None),
    'Ice Cream & Novelties': ('frozen', 'ice_cream'),
    'The Ice Cream Shop': ('frozen', 'ice_cream'),
    'Frozen Meals': ('frozen', 'frozen_meals'),
    'Frozen Appetizers & Snacks': ('frozen', 'frozen_meals'),
    'Frozen Produce': ('frozen', 'frozen_produce'),
    'Frozen Breakfast': ('frozen', 'frozen_meals'),
    'Frozen Pizza': ('frozen', 'frozen_meals'),
    'Frozen Desserts': ('frozen', 'ice_cream'),
    'Frozen Meat, Seafood, & Vegetarian': ('frozen', 'frozen_meals'),
    'Frozen Potatoes': ('frozen', 'frozen_produce'),
    'Chocolate': ('snacks', 'candy'),
    'Gummy & chewy candy': ('snacks', 'candy'),
    'Hard candy & lollipops': ('snacks', 'candy'),
    'Multipacks & bags': ('snacks', 'candy'),
    'Gum': ('snacks', 'candy'),
    'Mints': ('snacks', 'candy'),
    'Better for you': ('snacks', 'candy'),
    'Baking Mixes': ('pantry', 'baking'),
    'Sugars & Sweeteners': ('pantry', 'baking'),
    'Flours & Meals': ('pantry', 'baking'),
    'Baking Soda & Starch': ('pantry', 'baking'),
    'Oil & Shortening': ('pantry', 'baking'),
    'Yeasts': ('pantry', 'baking'),
    'Baking Nuts': ('pantry', 'baking'),
    'Canned & Powdered Milks': ('pantry', 'baking'),
    'Baking Chocolate Chips & Cocoa': ('pantry', 'baking'),
    'Frosting & Decor': ('pantry', 'baking'),
    'Extracts & Spices': ('pantry', 'baking'),
    'Marshmallow': ('pantry', 'baking'),
    'Top Baking Brands': ('pantry', 'baking'),
}

def normalize_category(walmart_subcategory: str) -> tuple[str, str | None]:
    """Map Walmart subcategory to Goods taxonomy.
    
    Args:
        walmart_subcategory: Walmart subcategory name
        
    Returns:
        Tuple of (goods_category, goods_subcategory) or ('uncategorized', None) if not found
    """
    return CATEGORY_MAP.get(walmart_subcategory, ('uncategorized', None))
```

## Notes
- UPC only in PDP, not search results
- Aggressive bot detection - use realistic headers
- `productLocation` may be `null` for items not in selected store
- **Category mapping**: Use subcategory name from product data to map to Goods categories
- **Exclusions**: Products in excluded subcategories should be deleted along with all variants

