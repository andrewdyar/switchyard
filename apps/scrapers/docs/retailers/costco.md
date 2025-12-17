# Costco

## API Overview
- **Type**: REST
- **Base URL**: `https://www.costco.com/`
- **Authentication**: Membership-based (cookies)
- **Rate Limiting**: Strict bot detection

## Endpoints

### Category/Search
- **URL**: `GET /CatalogSearch`
- **Key Parameters**:
  - `keyword`: Search query
  - `dept`: Department filter
  - `pageSize`: Results per page

### Product Detail (PDP)
- **URL**: `GET /[product-slug].product.[item_id].html`
- **Response**: HTML with embedded JSON

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `itemNumber` | `external_id` | Costco item number |
| `item_manufacturing_skus` | `barcode` | GTIN-14, convert to UPC-12 |
| `productName` | `name` | Product name |
| `brand` | `brand` | Brand name |
| `priceTotal` | `cost_price` | Current price |
| `unitPriceAmount` | `price_per_unit` | Price per unit |
| `unitPriceUom` | `price_per_unit_uom` | oz, lb, ct, etc. |

## Barcode Strategy

Costco uses GTIN-14 format. Strip the first 2 digits to get UPC-12:

```
GTIN-14:  10012345678905
          ^^            
          Packaging indicator (strip these)
          
UPC-12:     012345678905
```

## Python Example

```python
def gtin14_to_upc12(gtin14: str) -> str:
    """Convert GTIN-14 to UPC-12 by stripping first 2 digits."""
    if len(gtin14) == 14:
        return gtin14[2:]
    return gtin14

def extract_costco_product(data: dict) -> dict:
    """Extract product data from Costco response."""
    mfg_skus = data.get('item_manufacturing_skus', [])
    barcode = None
    if mfg_skus:
        gtin = mfg_skus[0] if isinstance(mfg_skus[0], str) else mfg_skus[0].get('value')
        if gtin:
            barcode = gtin14_to_upc12(gtin)
    
    return {
        'external_id': data.get('itemNumber'),
        'barcode': barcode,
        'name': data.get('productName'),
        'brand': data.get('brand'),
        'cost_price': data.get('priceTotal'),
    }
```

## Category Mapping

Costco uses a hierarchical category structure with subcategories nested under top-level categories. Each subcategory maps to exactly one Goods category/subcategory. Products in subcategories that don't fit the Goods taxonomy are excluded.

### Mapping Strategy

- **Subcategory-level mapping**: Only subcategories are mapped (not top-level categories)
- **One-to-one mapping**: Each Costco subcategory maps to exactly one Goods category/subcategory
- **Parent context required**: Some subcategory names may be duplicated across parent categories, so parent category must be used to disambiguate
- **Exclusions**: Subcategories that don't fit Goods taxonomy are excluded (products in these subcategories will be deleted)

### Complete Subcategory Mapping

The following table shows all Costco subcategories mapped to Goods categories:

| Costco Parent | Costco Subcategory | Goods Category | Goods Subcategory |
|---------------|-------------------|----------------|-------------------|
| Produce | Fresh Fruits | produce | fruit |
| Produce | Fresh Vegetables | produce | vegetables |
| Meat & Seafood | Beef | meat_seafood | beef |
| Meat & Seafood | Pork | meat_seafood | pork |
| Meat & Seafood | Lamb | meat_seafood | *none* |
| Meat & Seafood | Seafood | meat_seafood | seafood |
| Poultry | Chicken | meat_seafood | poultry |
| Poultry | Turkey | meat_seafood | poultry |
| Poultry | Duck | meat_seafood | poultry |
| Deli | Deli Meat | meat_seafood | *none* |
| Deli | Hot Dogs, Bacon & Sausage | meat_seafood | pork |
| Deli | Prosciutto, Smoked & Cured Meats | meat_seafood | *none* |
| Deli | Caviar | meat_seafood | seafood |
| Deli | Dips & Spreads | pantry | condiments |
| Cheese & Dairy | Cheese | dairy_eggs | cheese |
| Cheese & Dairy | Butter | dairy_eggs | butter |
| Cheese & Dairy | Yogurt | dairy_eggs | yogurt |
| Beverages & Water | Milk & Milk Substitutes | dairy_eggs | milk |
| Bakery & Desserts | Tortillas & Flatbreads | bakery | tortillas |
| Frozen Foods | Frozen Meals | frozen | frozen_meals |
| Frozen Foods | Appetizers & Side Dishes | frozen | frozen_meals |
| Frozen Foods | Frozen Meat & Seafood | frozen | frozen_meals |
| Frozen Foods | Ice Cream & Frozen Desserts | frozen | ice_cream |
| Pantry & Dry Goods | Pasta, Rice & Grains | pantry | pasta_rice |
| Pantry & Dry Goods | Soup, Bouillon & Broth | pantry | canned_goods |
| Pantry & Dry Goods | Sauces, Condiments & Marinades | pantry | condiments |
| Pantry & Dry Goods | Nut Butters, Jelly & Jam | pantry | condiments |
| Pantry & Dry Goods | Honey | pantry | condiments |
| Pantry & Dry Goods | Vinegar & Cooking Oil | pantry | condiments |
| Pantry & Dry Goods | Spices, Seasonings & Dried Herbs | pantry | baking |
| Pantry & Dry Goods | Flour & Baking Supplies | pantry | baking |
| Pantry & Dry Goods | Sugar, Syrup & Sweeteners | pantry | baking |
| Canned Goods | Canned Meats | pantry | canned_goods |
| Beverages & Water | Water | beverages | water |
| Beverages & Water | Juice | beverages | juice |
| Beverages & Water | Fresh Juice & Cold Drinks | beverages | juice |
| Beverages & Water | Soda, Pop & Soft Drinks | beverages | soda |
| Beverages & Water | Sports & Energy Drinks | beverages | soda |
| Beverages & Water | Tea | beverages | coffee_tea |
| Beverages & Water | Powdered Drink Mix | beverages | *none* |
| Coffee | Ground Coffee | beverages | coffee_tea |
| Coffee | Whole Bean Coffee | beverages | coffee_tea |
| Coffee | Instant Coffee | beverages | coffee_tea |
| Coffee | K-Cups, Coffee Pods & Capsules | beverages | coffee_tea |
| Coffee | Coffee Creamers | dairy_eggs | milk |
| Snacks | Chips & Pretzels | snacks | chips |
| Snacks | Crackers | snacks | crackers |
| Snacks | Cookies | snacks | candy |
| Snacks | Popcorn | snacks | chips |
| Snacks | Pastries & Muffins | bakery | pastries |
| Candy | Chocolates | snacks | candy |
| Candy | Hard & Gummy Candy | snacks | candy |
| Candy | Gum & Mints | snacks | candy |
| Cleaning Supplies | Cleaning Tools | household | cleaning |
| Cleaning Supplies | Dish Soap & Dishwasher Detergent | household | cleaning |
| Cleaning Supplies | Laundry Detergent & Supplies | household | cleaning |
| Cleaning Supplies | Trash Bags | household | cleaning |
| Paper & Plastic Products | Paper Towels & Napkins | household | paper_products |
| Paper & Plastic Products | Toilet Paper | household | paper_products |
| Paper & Plastic Products | Facial Tissue | household | paper_products |
| Paper & Plastic Products | Food Storage Bags | household | cleaning |
| Paper & Plastic Products | Parchment Paper, Plastic Wrap & Aluminum Foil | household | cleaning |
| Pet Supplies | Dog Food | household | pet |
| Pet Supplies | Cat Food | household | pet |

### Excluded Subcategories

The following subcategories are excluded from the Goods taxonomy (products in these subcategories will be deleted):

- **Deli**: Prepared Meals & Foods (prepared items)
- **Grocery & Household Essentials**: Emergency Food Supplies & Kits, Kirkland Signature Grocery (brand category), Organic Groceries (attribute, not category), Wine, Champagne & Sparkling (alcohol)
- **Baby Food & Formula**: Baby Food, Toddler Food (baby-specific)
- **Paper & Plastic Products**: Paper, Plastic & Disposable Plates, Paper & Disposable Bowls, Plastic & Disposable Utensils, Plastic, Paper & Disposable Cups (not in Goods taxonomy)
- **Snacks**: Nuts & Seeds, Dried Fruit, Jerky & Dried Meats, Fruit Snacks & Applesauce, Protein, Breakfast & Snack Bars, Snack & Trail Mix (no direct matches)
- **Breakfast**: Cereal, Oatmeal, Granola & Oats (no direct match)
- **Nutrition**: Healthy Snacks & Mixes (generic category)

### Python Implementation

```python
# Costco Category Mapping
# Note: Some subcategory names may be duplicated across parents
# Use parent category to disambiguate

CATEGORY_MAP = {
    'Produce': {
        'Fresh Fruits': ('produce', 'fruit'),
        'Fresh Vegetables': ('produce', 'vegetables'),
    },
    'Meat & Seafood': {
        'Beef': ('meat_seafood', 'beef'),
        'Pork': ('meat_seafood', 'pork'),
        'Lamb': ('meat_seafood', None),
        'Seafood': ('meat_seafood', 'seafood'),
    },
    'Poultry': {
        'Chicken': ('meat_seafood', 'poultry'),
        'Turkey': ('meat_seafood', 'poultry'),
        'Duck': ('meat_seafood', 'poultry'),
    },
    'Deli': {
        'Deli Meat': ('meat_seafood', None),
        'Hot Dogs, Bacon & Sausage': ('meat_seafood', 'pork'),
        'Prosciutto, Smoked & Cured Meats': ('meat_seafood', None),
        'Caviar': ('meat_seafood', 'seafood'),
        'Dips & Spreads': ('pantry', 'condiments'),
    },
    'Cheese & Dairy': {
        'Cheese': ('dairy_eggs', 'cheese'),
        'Butter': ('dairy_eggs', 'butter'),
        'Yogurt': ('dairy_eggs', 'yogurt'),
    },
    'Beverages & Water': {
        'Milk & Milk Substitutes': ('dairy_eggs', 'milk'),
        'Water': ('beverages', 'water'),
        'Juice': ('beverages', 'juice'),
        'Fresh Juice & Cold Drinks': ('beverages', 'juice'),
        'Soda, Pop & Soft Drinks': ('beverages', 'soda'),
        'Sports & Energy Drinks': ('beverages', 'soda'),
        'Tea': ('beverages', 'coffee_tea'),
        'Powdered Drink Mix': ('beverages', None),
    },
    'Bakery & Desserts': {
        'Tortillas & Flatbreads': ('bakery', 'tortillas'),
    },
    'Frozen Foods': {
        'Frozen Meals': ('frozen', 'frozen_meals'),
        'Appetizers & Side Dishes': ('frozen', 'frozen_meals'),
        'Frozen Meat & Seafood': ('frozen', 'frozen_meals'),
        'Ice Cream & Frozen Desserts': ('frozen', 'ice_cream'),
    },
    'Pantry & Dry Goods': {
        'Pasta, Rice & Grains': ('pantry', 'pasta_rice'),
        'Soup, Bouillon & Broth': ('pantry', 'canned_goods'),
        'Sauces, Condiments & Marinades': ('pantry', 'condiments'),
        'Nut Butters, Jelly & Jam': ('pantry', 'condiments'),
        'Honey': ('pantry', 'condiments'),
        'Vinegar & Cooking Oil': ('pantry', 'condiments'),
        'Spices, Seasonings & Dried Herbs': ('pantry', 'baking'),
        'Flour & Baking Supplies': ('pantry', 'baking'),
        'Sugar, Syrup & Sweeteners': ('pantry', 'baking'),
    },
    'Canned Goods': {
        'Canned Meats': ('pantry', 'canned_goods'),
    },
    'Coffee': {
        'Ground Coffee': ('beverages', 'coffee_tea'),
        'Whole Bean Coffee': ('beverages', 'coffee_tea'),
        'Instant Coffee': ('beverages', 'coffee_tea'),
        'K-Cups, Coffee Pods & Capsules': ('beverages', 'coffee_tea'),
        'Coffee Creamers': ('dairy_eggs', 'milk'),
    },
    'Snacks': {
        'Chips & Pretzels': ('snacks', 'chips'),
        'Crackers': ('snacks', 'crackers'),
        'Cookies': ('snacks', 'candy'),
        'Popcorn': ('snacks', 'chips'),
        'Pastries & Muffins': ('bakery', 'pastries'),
    },
    'Candy': {
        'Chocolates': ('snacks', 'candy'),
        'Hard & Gummy Candy': ('snacks', 'candy'),
        'Gum & Mints': ('snacks', 'candy'),
    },
    'Cleaning Supplies': {
        'Cleaning Tools': ('household', 'cleaning'),
        'Dish Soap & Dishwasher Detergent': ('household', 'cleaning'),
        'Laundry Detergent & Supplies': ('household', 'cleaning'),
        'Trash Bags': ('household', 'cleaning'),
    },
    'Paper & Plastic Products': {
        'Paper Towels & Napkins': ('household', 'paper_products'),
        'Toilet Paper': ('household', 'paper_products'),
        'Facial Tissue': ('household', 'paper_products'),
        'Food Storage Bags': ('household', 'cleaning'),
        'Parchment Paper, Plastic Wrap & Aluminum Foil': ('household', 'cleaning'),
    },
    'Pet Supplies': {
        'Dog Food': ('household', 'pet'),
        'Cat Food': ('household', 'pet'),
    },
}

def normalize_costco_category(parent: str, subcategory: str) -> tuple[str, str | None]:
    """Map Costco category to Goods taxonomy.
    
    Args:
        parent: Costco parent category name
        subcategory: Costco subcategory name
        
    Returns:
        Tuple of (goods_category, goods_subcategory) or ('uncategorized', None) if not found
    """
    parent_map = CATEGORY_MAP.get(parent, {})
    return parent_map.get(subcategory, ('uncategorized', None))
```

## Notes
- UPC via GTIN-14 in `item_manufacturing_skus`
- No aisle location (warehouse format)
- Bulk items need special handling for SKU relationships
- **Category mapping**: Use both parent category and subcategory name to map to Goods categories
- **Exclusions**: Products in excluded subcategories should be deleted along with all variants

