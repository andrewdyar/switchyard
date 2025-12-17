# Trader Joe's

## API Overview
- **Type**: GraphQL
- **Base URL**: `https://www.traderjoes.com/api/graphql`
- **Authentication**: None required

## Endpoints

### Category/Search
- **URL**: `POST /api/graphql`
- **Operation**: `SearchProducts`
- **Key Parameters**:
  - `categoryId`: Category identifier
  - `currentPage`: Page number
  - `pageSize`: Results per page

### Product Detail (PDP)
- **URL**: `POST /api/graphql`
- **Operation**: `GetProductBySku`
- **Key Parameters**:
  - `sku`: Product SKU (6-digit)

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `sku` | `external_id` | 6-digit TJ SKU |
| (computed) | `barcode` | EAN-8 from SKU |
| `item_title` | `name` | Product name |
| `brand` | `brand` | Usually "Trader Joe's" |
| `retail_price` | `cost_price` | Current price |
| `sales_size` | `size` | Package size |
| `primary_image` | `image_url` | Product image |

## Barcode Strategy

Trader Joe's uses EAN-8 barcodes computed from the 6-digit SKU:

```
EAN-8 = "0" + SKU (6 digits) + check digit
Example: SKU "086453" → EAN-8 "00864534"
```

## Python Example

```python
def calculate_ean8_check_digit(digits_7: str) -> str:
    """Calculate EAN-8 check digit."""
    weights = [3, 1, 3, 1, 3, 1, 3]
    total = sum(int(d) * w for d, w in zip(digits_7, weights))
    check = (10 - (total % 10)) % 10
    return str(check)

def sku_to_ean8(sku: str) -> str:
    """Convert 6-digit TJ SKU to EAN-8 barcode."""
    sku_padded = sku.zfill(6)
    ean7 = "0" + sku_padded  # e.g., "0086453"
    check = calculate_ean8_check_digit(ean7)
    return ean7 + check  # e.g., "00864534"

def extract_traderjoes_product(product: dict) -> dict:
    """Extract product data from TJ GraphQL response."""
    sku = product.get('sku', '')
    
    return {
        'external_id': sku,
        'barcode': sku_to_ean8(sku) if sku else None,
        'name': product.get('item_title'),
        'brand': product.get('brand', "Trader Joe's"),
        'cost_price': product.get('retail_price'),
        'size': product.get('sales_size'),
        'image_url': product.get('primary_image'),
    }
```

## Category Mapping

Trader Joe's uses a hierarchical category structure with subcategories nested under top-level categories. Each subcategory maps to exactly one Goods category/subcategory. Products in subcategories that don't fit the Goods taxonomy are excluded.

### Mapping Strategy

- **Subcategory-level mapping**: Only subcategories (level 4) are mapped (not top-level categories)
- **One-to-one mapping**: Each Trader Joe's subcategory maps to exactly one Goods category/subcategory
- **Parent context required**: Some subcategory names may be duplicated across parent categories, so parent category must be used to disambiguate
- **Exclusions**: Subcategories that don't fit Goods taxonomy are excluded (products in these subcategories will be deleted)

### Complete Subcategory Mapping

The following table shows all Trader Joe's subcategories mapped to Goods categories:

| Trader Joe's Parent | Trader Joe's Subcategory | Goods Category | Goods Subcategory |
|---------------------|-------------------------|----------------|-------------------|
| Fresh Fruits & Veggies | Fruits | produce | fruit |
| Fresh Fruits & Veggies | Veggies | produce | vegetables |
| Meat, Seafood & Plant-based | Beef, Pork & Lamb | meat_seafood | *none* |
| Meat, Seafood & Plant-based | Chicken & Turkey | meat_seafood | poultry |
| Meat, Seafood & Plant-based | Fish & Seafood | meat_seafood | seafood |
| Meat, Seafood & Plant-based | Plant-based Protein | meat_seafood | plant_based |
| Dairy & Eggs | Milk & Cream | dairy_eggs | milk |
| Dairy & Eggs | Butter | dairy_eggs | butter |
| Dairy & Eggs | Yogurt, etc. | dairy_eggs | yogurt |
| Dairy & Eggs | Eggs | dairy_eggs | eggs |
| Cheese | Slices, Shreds, Crumbles | dairy_eggs | cheese |
| Cheese | Wedges, Wheels, Loaves, Logs | dairy_eggs | cheese |
| Cheese | Cream and Creamy Cheeses | dairy_eggs | cheese |
| Bakery | Sliced Bread | bakery | bread |
| Bakery | Loaves, Rolls, Buns | bakery | bread |
| Bakery | Bagels | bakery | bread |
| Bakery | Tortillas & Flatbreads | bakery | tortillas |
| Bakery | Sweet Stuff | bakery | pastries |
| From The Freezer | Appetizers | frozen | frozen_meals |
| From The Freezer | Entrées & Sides | frozen | frozen_meals |
| From The Freezer | Fruit & Vegetables | frozen | frozen_produce |
| From The Freezer | Cool Desserts | frozen | ice_cream |
| For the Pantry | Pastas & Grains | pantry | pasta_rice |
| For the Pantry | Packaged Fish, Meat, Fruit & Veg | pantry | canned_goods |
| For the Pantry | Nut Butters & Fruit Spreads | pantry | condiments |
| For the Pantry | Oils & Vinegars | pantry | condiments |
| For the Pantry | For Baking & Cooking | pantry | baking |
| For the Pantry | Spices | pantry | baking |
| For the Pantry | Soup, Chili & Meals | pantry | canned_goods |
| For the Pantry | Honeys, Syrups & Nectars | pantry | condiments |
| Dips, Sauces & Dressings | Condiments | pantry | condiments |
| Dips, Sauces & Dressings | BBQ, Pasta, Simmer | pantry | condiments |
| Dips, Sauces & Dressings | Salsa & Hot Sauce | pantry | condiments |
| Dips, Sauces & Dressings | Dip/Spread | pantry | condiments |
| Dips, Sauces & Dressings | Dressing & Seasoning | pantry | condiments |
| Snacks & Sweets | Chips, Crackers & Crunchy Bites | snacks | chips |
| Snacks & Sweets | Candies & Cookies | snacks | candy |
| Beverages | Juices & More | beverages | juice |
| Beverages | Water (Sparkling & Still) | beverages | water |
| Beverages | Coffee & Tea | beverages | coffee_tea |
| Beverages | Sodas & Mixers | beverages | soda |
| Everything Else | Household Essentials | household | cleaning |
| Everything Else | For the Face & Body | health_beauty | personal_care |
| Everything Else | Pet Stuff | household | pet |
| Everything Else | Nutritional Supplements | health_beauty | vitamins |

### Excluded Subcategories

The following subcategories are excluded from the Goods taxonomy (products in these subcategories will be deleted):

- **Fresh Prepared Foods**: All subcategories (Salads, Soups & Sides, Wraps, Burritos & Sandwiches, Entrées & Center of Plate, Dessert & Sweets) - prepared items
- **Beverages**: Wine, Beer & Liquor (alcohol)
- **For the Pantry**: Cereals (no direct match)
- **Snacks & Sweets**: Nuts, Dried Fruits, Seeds, Bars, Jerky & … Surprises (no direct matches)
- **Beverages**: Non-Dairy Bev (generic category, no direct match)

### Python Implementation

```python
# Trader Joe's Category Mapping
# Note: Some subcategory names may be duplicated across parents
# Use parent category to disambiguate

CATEGORY_MAP = {
    'Fresh Fruits & Veggies': {
        'Fruits': ('produce', 'fruit'),
        'Veggies': ('produce', 'vegetables'),
    },
    'Meat, Seafood & Plant-based': {
        'Beef, Pork & Lamb': ('meat_seafood', None),
        'Chicken & Turkey': ('meat_seafood', 'poultry'),
        'Fish & Seafood': ('meat_seafood', 'seafood'),
        'Plant-based Protein': ('meat_seafood', 'plant_based'),
    },
    'Dairy & Eggs': {
        'Milk & Cream': ('dairy_eggs', 'milk'),
        'Butter': ('dairy_eggs', 'butter'),
        'Yogurt, etc.': ('dairy_eggs', 'yogurt'),
        'Eggs': ('dairy_eggs', 'eggs'),
    },
    'Cheese': {
        'Slices, Shreds, Crumbles': ('dairy_eggs', 'cheese'),
        'Wedges, Wheels, Loaves, Logs': ('dairy_eggs', 'cheese'),
        'Cream and Creamy Cheeses': ('dairy_eggs', 'cheese'),
    },
    'Bakery': {
        'Sliced Bread': ('bakery', 'bread'),
        'Loaves, Rolls, Buns': ('bakery', 'bread'),
        'Bagels': ('bakery', 'bread'),
        'Tortillas & Flatbreads': ('bakery', 'tortillas'),
        'Sweet Stuff': ('bakery', 'pastries'),
    },
    'From The Freezer': {
        'Appetizers': ('frozen', 'frozen_meals'),
        'Entrées & Sides': ('frozen', 'frozen_meals'),
        'Fruit & Vegetables': ('frozen', 'frozen_produce'),
        'Cool Desserts': ('frozen', 'ice_cream'),
    },
    'For the Pantry': {
        'Pastas & Grains': ('pantry', 'pasta_rice'),
        'Packaged Fish, Meat, Fruit & Veg': ('pantry', 'canned_goods'),
        'Nut Butters & Fruit Spreads': ('pantry', 'condiments'),
        'Oils & Vinegars': ('pantry', 'condiments'),
        'For Baking & Cooking': ('pantry', 'baking'),
        'Spices': ('pantry', 'baking'),
        'Soup, Chili & Meals': ('pantry', 'canned_goods'),
        'Honeys, Syrups & Nectars': ('pantry', 'condiments'),
    },
    'Dips, Sauces & Dressings': {
        'Condiments': ('pantry', 'condiments'),
        'BBQ, Pasta, Simmer': ('pantry', 'condiments'),
        'Salsa & Hot Sauce': ('pantry', 'condiments'),
        'Dip/Spread': ('pantry', 'condiments'),
        'Dressing & Seasoning': ('pantry', 'condiments'),
    },
    'Snacks & Sweets': {
        'Chips, Crackers & Crunchy Bites': ('snacks', 'chips'),
        'Candies & Cookies': ('snacks', 'candy'),
    },
    'Beverages': {
        'Juices & More': ('beverages', 'juice'),
        'Water (Sparkling & Still)': ('beverages', 'water'),
        'Coffee & Tea': ('beverages', 'coffee_tea'),
        'Sodas & Mixers': ('beverages', 'soda'),
    },
    'Everything Else': {
        'Household Essentials': ('household', 'cleaning'),
        'For the Face & Body': ('health_beauty', 'personal_care'),
        'Pet Stuff': ('household', 'pet'),
        'Nutritional Supplements': ('health_beauty', 'vitamins'),
    },
}

def normalize_traderjoes_category(parent: str, subcategory: str) -> tuple[str, str | None]:
    """Map Trader Joe's category to Goods taxonomy.
    
    Args:
        parent: Trader Joe's parent category name
        subcategory: Trader Joe's subcategory name
        
    Returns:
        Tuple of (goods_category, goods_subcategory) or ('uncategorized', None) if not found
    """
    parent_map = CATEGORY_MAP.get(parent, {})
    return parent_map.get(subcategory, ('uncategorized', None))
```

## Notes
- No UPC in API - must compute EAN-8 from SKU
- No in-store locations available
- Most products are Trader Joe's private label
- EAN-8 compatible with standard barcode scanners
- **Category mapping**: Use both parent category and subcategory name to map to Goods categories
- **Exclusions**: Products in excluded subcategories should be deleted along with all variants

