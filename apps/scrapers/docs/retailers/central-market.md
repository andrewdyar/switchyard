# Central Market

## API Overview
- **Type**: GraphQL (HEB backend)
- **Base URL**: `https://www.centralmarket.com/_next/data/`
- **Authentication**: None required
- **Note**: Uses HEB's backend infrastructure

## Endpoints

### Category/Search
- **URL**: `GET /_next/data/{build_id}/search.json?q={query}`
- **Key Parameters**:
  - `build_id`: Next.js build ID (changes on deploy)
  - `q`: Search query
  - `storeId`: Store identifier

### Product Detail (PDP)
- **URL**: `GET /_next/data/{build_id}/product/{product_id}.json`

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `productId` | `external_id` | Central Market product ID |
| `sku` | `barcode` | UPC |
| `description` | `name` | Product name |
| `brand.name` | `brand` | Brand name |
| `currentPrice.amount` | `cost_price` | Current price |
| `unitListPrice.amount` | `price_per_unit` | Price per unit |
| `aisle_location` | `store_location` | Aisle info |

## Python Example

```python
def extract_central_market_product(data: dict) -> dict:
    """Extract product data from Central Market Next.js response."""
    page_props = data.get('pageProps', {})
    product = page_props.get('product', {})
    
    return {
        'external_id': product.get('productId'),
        'barcode': product.get('sku'),
        'name': product.get('description'),
        'brand': product.get('brand', {}).get('name'),
        'cost_price': product.get('currentPrice', {}).get('amount'),
        'price_per_unit': product.get('unitListPrice', {}).get('amount'),
        'store_location': product.get('aisle_location'),
    }
```

## Category Mapping

Central Market uses a hierarchical category structure with subcategories nested under top-level categories. Each subcategory maps to exactly one Goods category/subcategory. Products in subcategories that don't fit the Goods taxonomy are excluded.

### Mapping Strategy

- **Subcategory-level mapping**: Only subcategories are mapped (not top-level categories)
- **One-to-one mapping**: Each Central Market subcategory maps to exactly one Goods category/subcategory
- **Parent context required**: Some subcategory names may be duplicated across parent categories, so parent category must be used to disambiguate
- **Exclusions**: Subcategories that don't fit Goods taxonomy are excluded (products in these subcategories will be deleted)

### Complete Subcategory Mapping

The following table shows all Central Market subcategories mapped to Goods categories:

| Central Market Parent | Central Market Subcategory | Goods Category | Goods Subcategory | Category ID | Subcategory ID |
|----------------------|---------------------------|----------------|-------------------|-------------|----------------|
| Fruits & Vegetables | Fruit | produce | fruit | 483475 | 483627 |
| Fruits & Vegetables | Vegetables | produce | vegetables | 483475 | 483718 |
| Meat & Poultry | Meat | meat_seafood | *none* | 1246473 | 1246475 |
| Meat & Poultry | Poultry | meat_seafood | poultry | 1246473 | 1246491 |
| Meat & Poultry | In-House Sausage | meat_seafood | pork | 1246473 | 1246474 |
| Meat & Poultry | Smoked Meats | meat_seafood | *none* | 1246473 | 1246505 |
| Seafood | Shellfish | meat_seafood | seafood | 1210269 | 1210270 |
| Seafood | Fish | meat_seafood | seafood | 1210269 | 1210283 |
| Grocery & Staples | Baking | pantry | baking | 483476 | 483548 |
| Grocery & Staples | Coffee, Tea, & Hot Cocoa | beverages | coffee_tea | 483476 | 483597 |
| Grocery & Staples | Nut Butters | pantry | condiments | 483476 | 483660 |
| Grocery & Staples | Sauces, Marinades, & Condiments | pantry | condiments | 483476 | 483694 |
| Grocery & Staples | Asian | pantry | *none* | 483476 | 485648 |
| Grocery & Staples | Chips & Salty Snacks | snacks | chips | 483476 | 1175783 |
| Grocery & Staples | Cookies & Sweet Snacks | snacks | candy | 483476 | 1175796 |
| Grocery & Staples | Crackers & Crisps | snacks | crackers | 483476 | 1175868 |
| Grocery & Staples | Chocolate & Candy | snacks | candy | 483476 | 1194954 |
| Grocery & Staples | Herbs & Spices | pantry | condiments | 483476 | 1209073 |
| Grocery & Staples | Salsa & Dips | pantry | condiments | 483476 | 1323605 |
| Grocery & Staples | Bread | bakery | bread | 483476 | 1323760 |
| Grocery & Staples | Breakfast & Cereal | pantry | *none* | 483476 | 1323768 |
| Grocery & Staples | Canned Goods | pantry | canned_goods | 483476 | 1323779 |
| Grocery & Staples | Fruit Spreads & Honey | pantry | condiments | 483476 | 1323802 |
| Grocery & Staples | Oil & Vinegar | pantry | condiments | 483476 | 1323810 |
| Grocery & Staples | Pasta & Sauce | pantry | pasta_rice | 483476 | 1323827 |
| Grocery & Staples | Rice, Beans, & Grains | pantry | pasta_rice | 483476 | 1323858 |
| Grocery & Staples | Salad Dressing & Toppings | pantry | condiments | 483476 | 1323868 |
| Grocery & Staples | Soups & Chili | pantry | canned_goods | 483476 | 1323899 |
| Grocery & Staples | Stocks & Broth | pantry | canned_goods | 483476 | 1323902 |
| Bulk Foods | Baking & Spices | pantry | baking | 1547011 | 1547012 |
| Bulk Foods | Chocolate & Candy | snacks | candy | 1547011 | 1547025 |
| Bulk Foods | Coffee Beans & Loose-Leaf Tea | beverages | coffee_tea | 1547011 | 1547031 |
| Bulk Foods | Rice, Beans, & Grains | pantry | pasta_rice | 1547011 | 1547058 |
| Dairy & Eggs | Eggs | dairy_eggs | eggs | 483468 | 483544 |
| Dairy & Eggs | Milk & Cream | dairy_eggs | milk | 483468 | 483545 |
| Dairy & Eggs | Yogurt | dairy_eggs | yogurt | 483468 | 483546 |
| Dairy & Eggs | Packaged Cheese | dairy_eggs | cheese | 483468 | 1169260 |
| Dairy & Eggs | Butter | dairy_eggs | butter | 483468 | 1170398 |
| Dairy & Eggs | Biscuits & Dessert | bakery | pastries | 483468 | 483528 |
| Dairy & Eggs | Tofu & Meat Alternatives | meat_seafood | plant_based | 483468 | 1179950 |
| Deli | Deli Meats | meat_seafood | *none* | 1309768 | 1309769 |
| Deli | Fresh Pasta & Sauce | pantry | pasta_rice | 1309768 | 1309772 |
| Deli | Olive Bar | pantry | condiments | 1309768 | 1309773 |
| Cheese | Cheese Shop | dairy_eggs | cheese | 483466 | 483503 |
| Cheese | Packaged Cheese | dairy_eggs | cheese | 483466 | 483504 |
| Bakery | Bread & Rolls | bakery | bread | 483465 | 1303224 |
| Bakery | Sweets & Desserts | bakery | pastries | 483465 | 1303232 |
| Bakery | Tortillas | bakery | tortillas | 483465 | 1303244 |
| Bakery | Breakfast | bakery | pastries | 483465 | 1303218 |
| Frozen | Fruit & Vegetables | frozen | frozen_produce | 483471 | 483594 |
| Frozen | Ice Cream & Novelties | frozen | ice_cream | 483471 | 483604 |
| Frozen | Breakfast | frozen | frozen_meals | 483471 | 483571 |
| Frozen | Pizza | frozen | frozen_meals | 483471 | 1174279 |
| Frozen | Appetizers & Snacks | frozen | frozen_meals | 483471 | 1242349 |
| Frozen | Entrées & Sides | frozen | frozen_meals | 483471 | 1242362 |
| Frozen | Soup & Broth | frozen | frozen_meals | 483471 | 1242375 |
| Frozen | Ice | beverages | water | 483471 | 1242376 |
| Frozen | Sweets & Baking | frozen | ice_cream | 483471 | 1242388 |
| Beverages | Coconut & Aloe Water | beverages | water | 1174535 | 1174540 |
| Beverages | Cold Brew & Iced Coffee | beverages | coffee_tea | 1174535 | 1174541 |
| Beverages | Energy | beverages | soda | 1174535 | 1174542 |
| Beverages | Iced Tea | beverages | coffee_tea | 1174535 | 1174543 |
| Beverages | Juice & Fruit Drinks | beverages | juice | 1174535 | 1174546 |
| Beverages | Soda | beverages | soda | 1174535 | 1174565 |
| Beverages | Sparkling Water & Seltzer | beverages | water | 1174535 | 1174570 |
| Beverages | Water | beverages | water | 1174535 | 1174573 |
| Healthy Living | Diet & Nutrition | health_beauty | vitamins | 1329887 | 1329895 |
| Healthy Living | Personal Care | health_beauty | personal_care | 1329887 | 1329907 |
| Healthy Living | Vitamins & Supplements | health_beauty | vitamins | 1329887 | 1329923 |
| Household | Pet | household | pet | 1379429 | 483670 |
| Household | Household Essentials | household | cleaning | 1379429 | 1379431 |

### Excluded Subcategories

The following subcategories are excluded from the Goods taxonomy (products in these subcategories will be deleted):

- **Meat & Poultry**: Heat & Eat, Ready to Cook
- **Seafood**: Ready to Cook
- **Grocery & Staples**: Packaged Meals & Sides
- **Chef Prepared**: All subcategories (prepared items)
- **Deli**: Tamales (prepared)
- **Wine & Beer**: Beer, Wine, Cider, Hard Soda & Seltzer, Cocktail Mixers, Saké (alcohol)
- **Floral**: All subcategories (not in Goods taxonomy)
- **Frozen**: Bread (frozen bread - no direct match)
- **Healthy Living**: Aromatherapy, First Aid & Medicine
- **Household**: Décor, Kitchen & Dining, Outdoor
- **Kids & Baby**: All subcategories
- **Bulk Foods**: Granola & Oats, Nuts, Seeds, & Dried Fruit (no direct matches)
- **Grocery & Staples**: Nuts, Seeds, & Dried Fruit, Bars (no direct matches)
- **Beverages**: Instant Mixes, Kombucha & Fermented, Shrubs & Tonics (no direct matches)
- **Dairy & Eggs**: Dips, Spreads, & Sour Cream (no direct match)

### Python Implementation

```python
# Central Market Category Mapping
# Note: Some subcategory names may be duplicated across parents
# Use parent category to disambiguate

CATEGORY_MAP = {
    'Fruits & Vegetables': {
        'Fruit': ('produce', 'fruit'),
        'Vegetables': ('produce', 'vegetables'),
    },
    'Meat & Poultry': {
        'Meat': ('meat_seafood', None),
        'Poultry': ('meat_seafood', 'poultry'),
        'In-House Sausage': ('meat_seafood', 'pork'),
        'Smoked Meats': ('meat_seafood', None),
    },
    'Seafood': {
        'Shellfish': ('meat_seafood', 'seafood'),
        'Fish': ('meat_seafood', 'seafood'),
    },
    'Grocery & Staples': {
        'Baking': ('pantry', 'baking'),
        'Coffee, Tea, & Hot Cocoa': ('beverages', 'coffee_tea'),
        'Nut Butters': ('pantry', 'condiments'),
        'Sauces, Marinades, & Condiments': ('pantry', 'condiments'),
        'Asian': ('pantry', None),
        'Chips & Salty Snacks': ('snacks', 'chips'),
        'Cookies & Sweet Snacks': ('snacks', 'candy'),
        'Crackers & Crisps': ('snacks', 'crackers'),
        'Chocolate & Candy': ('snacks', 'candy'),
        'Herbs & Spices': ('pantry', 'condiments'),
        'Salsa & Dips': ('pantry', 'condiments'),
        'Bread': ('bakery', 'bread'),
        'Breakfast & Cereal': ('pantry', None),
        'Canned Goods': ('pantry', 'canned_goods'),
        'Fruit Spreads & Honey': ('pantry', 'condiments'),
        'Oil & Vinegar': ('pantry', 'condiments'),
        'Pasta & Sauce': ('pantry', 'pasta_rice'),
        'Rice, Beans, & Grains': ('pantry', 'pasta_rice'),
        'Salad Dressing & Toppings': ('pantry', 'condiments'),
        'Soups & Chili': ('pantry', 'canned_goods'),
        'Stocks & Broth': ('pantry', 'canned_goods'),
    },
    'Bulk Foods': {
        'Baking & Spices': ('pantry', 'baking'),
        'Chocolate & Candy': ('snacks', 'candy'),
        'Coffee Beans & Loose-Leaf Tea': ('beverages', 'coffee_tea'),
        'Rice, Beans, & Grains': ('pantry', 'pasta_rice'),
    },
    'Dairy & Eggs': {
        'Eggs': ('dairy_eggs', 'eggs'),
        'Milk & Cream': ('dairy_eggs', 'milk'),
        'Yogurt': ('dairy_eggs', 'yogurt'),
        'Packaged Cheese': ('dairy_eggs', 'cheese'),
        'Butter': ('dairy_eggs', 'butter'),
        'Biscuits & Dessert': ('bakery', 'pastries'),
        'Tofu & Meat Alternatives': ('meat_seafood', 'plant_based'),
    },
    'Deli': {
        'Deli Meats': ('meat_seafood', None),
        'Fresh Pasta & Sauce': ('pantry', 'pasta_rice'),
        'Olive Bar': ('pantry', 'condiments'),
    },
    'Cheese': {
        'Cheese Shop': ('dairy_eggs', 'cheese'),
        'Packaged Cheese': ('dairy_eggs', 'cheese'),
    },
    'Bakery': {
        'Bread & Rolls': ('bakery', 'bread'),
        'Sweets & Desserts': ('bakery', 'pastries'),
        'Tortillas': ('bakery', 'tortillas'),
        'Breakfast': ('bakery', 'pastries'),
    },
    'Frozen': {
        'Fruit & Vegetables': ('frozen', 'frozen_produce'),
        'Ice Cream & Novelties': ('frozen', 'ice_cream'),
        'Breakfast': ('frozen', 'frozen_meals'),
        'Pizza': ('frozen', 'frozen_meals'),
        'Appetizers & Snacks': ('frozen', 'frozen_meals'),
        'Entrées & Sides': ('frozen', 'frozen_meals'),
        'Soup & Broth': ('frozen', 'frozen_meals'),
        'Ice': ('beverages', 'water'),
        'Sweets & Baking': ('frozen', 'ice_cream'),
    },
    'Beverages': {
        'Coconut & Aloe Water': ('beverages', 'water'),
        'Cold Brew & Iced Coffee': ('beverages', 'coffee_tea'),
        'Energy': ('beverages', 'soda'),
        'Iced Tea': ('beverages', 'coffee_tea'),
        'Juice & Fruit Drinks': ('beverages', 'juice'),
        'Soda': ('beverages', 'soda'),
        'Sparkling Water & Seltzer': ('beverages', 'water'),
        'Water': ('beverages', 'water'),
    },
    'Healthy Living': {
        'Diet & Nutrition': ('health_beauty', 'vitamins'),
        'Personal Care': ('health_beauty', 'personal_care'),
        'Vitamins & Supplements': ('health_beauty', 'vitamins'),
    },
    'Household': {
        'Pet': ('household', 'pet'),
        'Household Essentials': ('household', 'cleaning'),
    },
    'Wine & Beer': {
        'Non-Alcoholic': ('beverages', None),
    },
}

def normalize_centralmarket_category(parent: str, subcategory: str) -> tuple[str, str | None]:
    """Map Central Market category to Goods taxonomy.
    
    Args:
        parent: Central Market parent category name
        subcategory: Central Market subcategory name
        
    Returns:
        Tuple of (goods_category, goods_subcategory) or ('uncategorized', None) if not found
    """
    parent_map = CATEGORY_MAP.get(parent, {})
    return parent_map.get(subcategory, ('uncategorized', None))
```

## Notes
- Uses HEB backend infrastructure
- `build_id` changes on deploy - must be extracted from page
- Avoid `purpose: prefetch` header (returns empty response)
- Premium/specialty items not available at HEB
- **Category mapping**: Use both parent category and subcategory name to map to Goods categories
- **Exclusions**: Products in excluded subcategories should be deleted along with all variants

