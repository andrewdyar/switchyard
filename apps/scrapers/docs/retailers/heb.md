# HEB

## API Overview
- **Type**: GraphQL
- **Base URL**: `https://www.heb.com/graphql`
- **Authentication**: None required (cookie-based session)
- **Rate Limiting**: Unknown, recommend 1-2 req/sec

## Endpoints

### Category/Search
- **URL Pattern**: `POST https://www.heb.com/graphql`
- **Operation**: `SearchResponse`
- **Key Parameters**:
  - `searchText`: Search query string
  - `storeId`: Store identifier
  - `categoryId`: Category filter
  - `limit`: Results per page (default 40)
  - `offset`: Pagination offset

### Product Detail (PDP)
- **URL Pattern**: `POST https://www.heb.com/graphql`
- **Operation**: `ProductPDP`
- **Key Parameters**:
  - `productId`: HEB product ID
  - `storeId`: Store identifier

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `productId` | `external_id` | HEB internal ID |
| `upc` | `barcode` | 12-digit UPC |
| `description` | `name` | Product name |
| `brand.name` | `brand` | Brand name |
| `currentPrice.amount` | `cost_price` | Current price |
| `originalPrice.amount` | `list_price` | Regular price |
| `unitListPrice.amount` | `price_per_unit` | Price per unit |
| `unitListPrice.unit` | `price_per_unit_uom` | oz, lb, ct, etc. |
| `size` | `size` | Package size |
| `image.url` | `image_url` | Product image |
| `aisle_location` | `store_location` | Aisle info |

## Barcode Strategy
- **Format**: UPC-12
- **Availability**: PDP response only
- **Field Path**: `data.product.upc`

## Python Example

```python
def extract_heb_product(data: dict) -> dict:
    """Extract product data from HEB GraphQL response."""
    product = data.get('data', {}).get('product', {})
    
    return {
        'external_id': product.get('productId'),
        'barcode': product.get('upc'),
        'name': product.get('description'),
        'brand': product.get('brand', {}).get('name'),
        'cost_price': product.get('currentPrice', {}).get('amount'),
        'list_price': product.get('originalPrice', {}).get('amount'),
        'price_per_unit': product.get('unitListPrice', {}).get('amount'),
        'price_per_unit_uom': product.get('unitListPrice', {}).get('unit'),
        'size': product.get('size'),
        'image_url': product.get('image', {}).get('url'),
        'store_location': product.get('aisle_location'),
    }
```

## Category Mapping

HEB uses a hierarchical category structure with subcategories nested under top-level categories. Each subcategory maps to exactly one Goods category/subcategory. Products in subcategories that don't fit the Goods taxonomy are excluded.

### Mapping Strategy

- **Subcategory-level mapping**: Only subcategories are mapped (not top-level categories)
- **One-to-one mapping**: Each HEB subcategory maps to exactly one Goods category/subcategory
- **Parent context required**: Some subcategory names are duplicated across parent categories (e.g., "Fruit" appears in both "Fruit & vegetables" and "Frozen food"), so parent category must be used to disambiguate
- **Exclusions**: Subcategories that don't fit Goods taxonomy are excluded (products in these subcategories will be deleted)

### Complete Subcategory Mapping

The following table shows all HEB subcategories mapped to Goods categories:

| HEB Parent | HEB Subcategory | Goods Category | Goods Subcategory | Category ID | Subcategory ID |
|------------|-----------------|----------------|-------------------|-------------|----------------|
| Fruit & vegetables | Fruit | produce | fruit | 490020 | 490082 |
| Fruit & vegetables | Vegetables | produce | vegetables | 490020 | 490083 |
| Meat & seafood | Meat | meat_seafood | *none* | 490023 | 490110 |
| Meat & seafood | Seafood | meat_seafood | seafood | 490023 | 490111 |
| Meat & seafood | Tofu & meat alternatives | meat_seafood | plant_based | 490023 | 490112 |
| Bakery & bread | Bread | bakery | bread | 490014 | 490027 |
| Bakery & bread | Breading & crumbs | pantry | baking | 490014 | 490028 |
| Bakery & bread | Cookies | snacks | candy | 490014 | 490030 |
| Bakery & bread | Desserts & pastries | bakery | pastries | 490014 | 490031 |
| Bakery & bread | Tortillas | bakery | tortillas | 490014 | 490032 |
| Bakery & bread | Cakes | bakery | pastries | 490014 | 490029 |
| Dairy & eggs | Biscuit & cookie dough | bakery | bread | 490016 | 490047 |
| Dairy & eggs | Butter & margarine | dairy_eggs | butter | 490016 | 490048 |
| Dairy & eggs | Cheese | dairy_eggs | cheese | 490016 | 490049 |
| Dairy & eggs | Cottage cheese | dairy_eggs | cheese | 490016 | 490050 |
| Dairy & eggs | Cream | dairy_eggs | milk | 490016 | 490051 |
| Dairy & eggs | Eggs & egg substitutes | dairy_eggs | eggs | 490016 | 490052 |
| Dairy & eggs | Milk | dairy_eggs | milk | 490016 | 490053 |
| Dairy & eggs | Pudding & gelatin | dairy_eggs | *none* | 490016 | 490054 |
| Dairy & eggs | Sour cream | dairy_eggs | *none* | 490016 | 490055 |
| Dairy & eggs | Yogurt | dairy_eggs | yogurt | 490016 | 490056 |
| Deli & prepared food | Cheese | dairy_eggs | cheese | 490017 | 490057 |
| Deli & prepared food | Dip | pantry | condiments | 490017 | 490058 |
| Deli & prepared food | Meat | meat_seafood | *none* | 490017 | 490059 |
| Pantry | Baking ingredients | pantry | baking | 490024 | 490113 |
| Pantry | Broth & bouillon | pantry | canned_goods | 490024 | 490114 |
| Pantry | Canned & dried food | pantry | canned_goods | 490024 | 490115 |
| Pantry | Cereal & breakfast | pantry | *none* | 490024 | 490116 |
| Pantry | Condiments | pantry | condiments | 490024 | 490117 |
| Pantry | Dressing, oil & vinegar | pantry | condiments | 490024 | 490118 |
| Pantry | Jelly & jam | pantry | condiments | 490024 | 490119 |
| Pantry | Pasta & rice | pantry | pasta_rice | 490024 | 490121 |
| Pantry | Peanut butter | pantry | condiments | 490024 | 490122 |
| Pantry | Salsa & dip | pantry | condiments | 490024 | 490123 |
| Pantry | Sauces & marinades | pantry | condiments | 490024 | 490124 |
| Pantry | Snacks & candy | snacks | *none* | 490024 | 490125 |
| Pantry | Soups & chili | pantry | canned_goods | 490024 | 490126 |
| Pantry | Spices & seasonings | pantry | condiments | 490024 | 490127 |
| Pantry | Sugar & sweeteners | pantry | baking | 490024 | 490128 |
| Frozen food | Bread & baked goods | frozen | *none* | 490019 | 490073 |
| Frozen food | Fruit | frozen | frozen_produce | 490019 | 490074 |
| Frozen food | Ice cream & treats | frozen | ice_cream | 490019 | 490075 |
| Frozen food | Juice & smoothies | frozen | *none* | 490019 | 490076 |
| Frozen food | Meals & sides | frozen | frozen_meals | 490019 | 490077 |
| Frozen food | Meat | frozen | frozen_meals | 490019 | 490078 |
| Frozen food | Meat alternatives | frozen | frozen_meals | 490019 | 490079 |
| Frozen food | Seafood | frozen | frozen_meals | 490019 | 490080 |
| Frozen food | Vegetables | frozen | frozen_produce | 490019 | 490081 |
| Beverages | Cocoa | beverages | coffee_tea | 490015 | 490034 |
| Beverages | Coconut water | beverages | water | 490015 | 490035 |
| Beverages | Coffee | beverages | coffee_tea | 490015 | 490036 |
| Beverages | Coffee creamer | dairy_eggs | *none* | 490015 | 490037 |
| Beverages | Ice | beverages | water | 490015 | 490039 |
| Beverages | Juice | beverages | juice | 490015 | 490040 |
| Beverages | Mixes & flavor enhancers | beverages | *none* | 490015 | 490041 |
| Beverages | Shakes & smoothies | beverages | *none* | 490015 | 490042 |
| Beverages | Soda | beverages | soda | 490015 | 490043 |
| Beverages | Sports & energy drinks | beverages | soda | 490015 | 490044 |
| Beverages | Tea | beverages | coffee_tea | 490015 | 490045 |
| Beverages | Water | beverages | water | 490015 | 490046 |
| Everyday essentials | Cleaners | household | cleaning | 490018 | 490064 |
| Everyday essentials | Cleaning tools | household | cleaning | 490018 | 490065 |
| Everyday essentials | Facial tissue | household | paper_products | 490018 | 490067 |
| Everyday essentials | Laundry | household | cleaning | 490018 | 490069 |
| Everyday essentials | Paper towels | household | paper_products | 490018 | 490070 |
| Everyday essentials | Toilet paper | household | paper_products | 490018 | 490071 |
| Everyday essentials | Trash bags | household | cleaning | 490018 | 490072 |
| Health & beauty | Bath & skin care | health_beauty | personal_care | 490021 | 490084 |
| Health & beauty | Hair care | health_beauty | personal_care | 490021 | 490090 |
| Health & beauty | Makeup | health_beauty | personal_care | 490021 | 490093 |
| Health & beauty | Nails | health_beauty | personal_care | 490021 | 490095 |
| Health & beauty | Cotton balls & swabs | health_beauty | personal_care | 490021 | 490085 |
| Health & beauty | Diet & fitness | health_beauty | vitamins | 490021 | 490086 |
| Health & beauty | Eye & ear care | health_beauty | personal_care | 490021 | 490087 |
| Health & beauty | Feminine care | health_beauty | personal_care | 490021 | 490088 |
| Health & beauty | Foot care | health_beauty | personal_care | 490021 | 490089 |
| Health & beauty | Home health care | health_beauty | personal_care | 490021 | 490091 |
| Health & beauty | Incontinence | health_beauty | personal_care | 490021 | 490092 |
| Health & beauty | Oral hygiene | health_beauty | personal_care | 490021 | 490096 |
| Health & beauty | Vitamins & supplements | health_beauty | vitamins | 490021 | 490098 |

### Excluded Subcategories

The following subcategories are excluded from the Goods taxonomy (products in these subcategories will be deleted):

- **Deli & prepared food**: Ready meals & snacks, Party trays
- **Pantry**: Pantry meals
- **Beverages**: Beer & wine, Coffee filters
- **Everyday essentials**: Air fresheners & candles, Batteries, Disposable kitchenware, Food storage & wraps
- **Health & beauty**: Medicines & treatments, Sexual wellness
- **Home & outdoor**: All subcategories (Bedding & bath, Clothes & shoes, Seasonal decor, Electronics, Home improvement, Kitchen & dining, Patio & outdoor, Pest control, School & office supplies, Storage & organization, Flowers & gift baskets)
- **Baby & kids**: All subcategories
- **Pets**: All subcategories
- **Donations**: All subcategories

### Python Implementation

```python
# HEB Category Mapping
# Note: Some subcategory names are duplicated across parents
# Use parent category to disambiguate

CATEGORY_MAP = {
    'Fruit & vegetables': {
        'Fruit': ('produce', 'fruit'),
        'Vegetables': ('produce', 'vegetables'),
    },
    'Meat & seafood': {
        'Meat': ('meat_seafood', None),
        'Seafood': ('meat_seafood', 'seafood'),
        'Tofu & meat alternatives': ('meat_seafood', 'plant_based'),
    },
    'Bakery & bread': {
        'Bread': ('bakery', 'bread'),
        'Breading & crumbs': ('pantry', 'baking'),
        'Cookies': ('snacks', 'candy'),
        'Desserts & pastries': ('bakery', 'pastries'),
        'Tortillas': ('bakery', 'tortillas'),
        'Cakes': ('bakery', 'pastries'),
    },
    'Dairy & eggs': {
        'Biscuit & cookie dough': ('bakery', 'bread'),
        'Butter & margarine': ('dairy_eggs', 'butter'),
        'Cheese': ('dairy_eggs', 'cheese'),
        'Cottage cheese': ('dairy_eggs', 'cheese'),
        'Cream': ('dairy_eggs', 'milk'),
        'Eggs & egg substitutes': ('dairy_eggs', 'eggs'),
        'Milk': ('dairy_eggs', 'milk'),
        'Pudding & gelatin': ('dairy_eggs', None),
        'Sour cream': ('dairy_eggs', None),
        'Yogurt': ('dairy_eggs', 'yogurt'),
    },
    'Deli & prepared food': {
        'Cheese': ('dairy_eggs', 'cheese'),
        'Dip': ('pantry', 'condiments'),
        'Meat': ('meat_seafood', None),
    },
    'Pantry': {
        'Baking ingredients': ('pantry', 'baking'),
        'Broth & bouillon': ('pantry', 'canned_goods'),
        'Canned & dried food': ('pantry', 'canned_goods'),
        'Cereal & breakfast': ('pantry', None),
        'Condiments': ('pantry', 'condiments'),
        'Dressing, oil & vinegar': ('pantry', 'condiments'),
        'Jelly & jam': ('pantry', 'condiments'),
        'Pasta & rice': ('pantry', 'pasta_rice'),
        'Peanut butter': ('pantry', 'condiments'),
        'Salsa & dip': ('pantry', 'condiments'),
        'Sauces & marinades': ('pantry', 'condiments'),
        'Snacks & candy': ('snacks', None),
        'Soups & chili': ('pantry', 'canned_goods'),
        'Spices & seasonings': ('pantry', 'condiments'),
        'Sugar & sweeteners': ('pantry', 'baking'),
    },
    'Frozen food': {
        'Bread & baked goods': ('frozen', None),
        'Fruit': ('frozen', 'frozen_produce'),
        'Ice cream & treats': ('frozen', 'ice_cream'),
        'Juice & smoothies': ('frozen', None),
        'Meals & sides': ('frozen', 'frozen_meals'),
        'Meat': ('frozen', 'frozen_meals'),
        'Meat alternatives': ('frozen', 'frozen_meals'),
        'Seafood': ('frozen', 'frozen_meals'),
        'Vegetables': ('frozen', 'frozen_produce'),
    },
    'Beverages': {
        'Cocoa': ('beverages', 'coffee_tea'),
        'Coconut water': ('beverages', 'water'),
        'Coffee': ('beverages', 'coffee_tea'),
        'Coffee creamer': ('dairy_eggs', None),
        'Ice': ('beverages', 'water'),
        'Juice': ('beverages', 'juice'),
        'Mixes & flavor enhancers': ('beverages', None),
        'Shakes & smoothies': ('beverages', None),
        'Soda': ('beverages', 'soda'),
        'Sports & energy drinks': ('beverages', 'soda'),
        'Tea': ('beverages', 'coffee_tea'),
        'Water': ('beverages', 'water'),
    },
    'Everyday essentials': {
        'Cleaners': ('household', 'cleaning'),
        'Cleaning tools': ('household', 'cleaning'),
        'Facial tissue': ('household', 'paper_products'),
        'Laundry': ('household', 'cleaning'),
        'Paper towels': ('household', 'paper_products'),
        'Toilet paper': ('household', 'paper_products'),
        'Trash bags': ('household', 'cleaning'),
    },
    'Health & beauty': {
        'Bath & skin care': ('health_beauty', 'personal_care'),
        'Hair care': ('health_beauty', 'personal_care'),
        'Makeup': ('health_beauty', 'personal_care'),
        'Nails': ('health_beauty', 'personal_care'),
        'Cotton balls & swabs': ('health_beauty', 'personal_care'),
        'Diet & fitness': ('health_beauty', 'vitamins'),
        'Eye & ear care': ('health_beauty', 'personal_care'),
        'Feminine care': ('health_beauty', 'personal_care'),
        'Foot care': ('health_beauty', 'personal_care'),
        'Home health care': ('health_beauty', 'personal_care'),
        'Incontinence': ('health_beauty', 'personal_care'),
        'Oral hygiene': ('health_beauty', 'personal_care'),
        'Vitamins & supplements': ('health_beauty', 'vitamins'),
    },
}

def normalize_heb_category(parent: str, subcategory: str) -> tuple[str, str | None]:
    """Map HEB category to Goods taxonomy.
    
    Args:
        parent: HEB parent category name
        subcategory: HEB subcategory name
        
    Returns:
        Tuple of (goods_category, goods_subcategory) or ('uncategorized', None) if not found
    """
    parent_map = CATEGORY_MAP.get(parent, {})
    return parent_map.get(subcategory, ('uncategorized', None))
```

## Notes
- UPC only available in PDP, not search results
- Store-specific pricing and availability
- Implements persisted queries with SHA256 hashes
- **Category mapping**: Use both parent category and subcategory name to map to Goods categories (some subcategory names are duplicated)
- **Exclusions**: Products in excluded subcategories should be deleted along with all variants

