# Whole Foods

## API Overview
- **Type**: HTML with embedded JSON
- **Base URL**: `https://www.wholefoodsmarket.com/`
- **Authentication**: Amazon account (optional for basic data)
- **Primary Identifier**: ASIN (not UPC)

## Endpoints

### Category/Search
- **URL**: `GET /products/[category]`
- **Response**: HTML with product grid

### Product Detail (PDP)
- **URL**: `GET /product/[product-slug]-[asin]`
- **Response**: HTML with embedded `__NEXT_DATA__` JSON

## Field Mapping

| API Field | Goods Schema Field | Notes |
|-----------|-------------------|-------|
| `asin` | `external_id` | Amazon ASIN |
| (via lookup) | `barcode` | Requires ASIN-to-UPC conversion |
| `title` | `name` | Product name |
| `brand` | `brand` | Brand name |
| `price.value` | `cost_price` | Current price |
| `price.perUnitPrice` | `price_per_unit` | Price per unit |
| `location.aisle` | `store_location` | Aisle (auth required) |

## Barcode Strategy

Whole Foods uses ASINs, not UPCs. Use RocketSource API for conversion:

```python
import requests

def convert_asins_to_upcs(asins: list[str], api_token: str) -> dict:
    """Convert ASINs to UPCs via RocketSource API."""
    response = requests.post(
        'https://api.rocketsource.io/api/v3/asin-convert',
        headers={
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        },
        json={
            'marketplace': 'US',
            'asins': asins
        }
    )
    return response.json()
```

## Python Example

```python
import json
from bs4 import BeautifulSoup

def extract_wholefoods_product(html: str) -> dict:
    """Extract product data from Whole Foods HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    
    script = soup.find('script', id='__NEXT_DATA__')
    if script:
        data = json.loads(script.string)
        props = data.get('props', {}).get('pageProps', {})
        product = props.get('product', {})
        
        return {
            'external_id': product.get('asin'),
            'name': product.get('title'),
            'brand': product.get('brand'),
            'cost_price': product.get('price', {}).get('value'),
            'price_per_unit': product.get('price', {}).get('perUnitPrice'),
        }
    return {}
```

## Category Mapping

Whole Foods uses a hierarchical category structure with subcategories nested under top-level categories. Each subcategory maps to exactly one Goods category/subcategory. Products in subcategories that don't fit the Goods taxonomy are excluded.

### Mapping Strategy

- **Subcategory-level mapping**: Only subcategories are mapped (not top-level categories)
- **One-to-one mapping**: Each Whole Foods subcategory maps to exactly one Goods category/subcategory
- **Exclusions**: Subcategories that don't fit Goods taxonomy are excluded (products in these subcategories will be deleted)

### Complete Subcategory Mapping

The following table shows all Whole Foods subcategories mapped to Goods categories:

| Whole Foods Parent Category | Whole Foods Subcategory | Goods Category | Goods Subcategory | Notes |
| :--------------------------- | :---------------------- | :------------- | :---------------- | :---- |
| Produce | Fresh Vegetables | produce | vegetables | |
| Produce | Fresh Fruit | produce | fruit | |
| Produce | Packaged Produce | produce | | |
| Produce | Dried Fruits &Vegetables | snacks | | |
| Produce | Herbs &Spices | pantry | baking | |
| Produce | Nuts &Seeds | snacks | | |
| Produce | Tofu &Plant-Based Proteins | meat_seafood | plant_based | |
| Meat & Seafood | Beef | meat_seafood | beef | |
| Meat & Seafood | Turkey | meat_seafood | poultry | |
| Meat & Seafood | Wild Game | meat_seafood | | |
| Meat & Seafood | Lamb | meat_seafood | | |
| Meat & Seafood | Seafood | meat_seafood | seafood | |
| Meat & Seafood | Packaged Cured & Deli Meats | meat_seafood | | |
| Meat & Seafood | Frozen Meats | frozen | frozen_meals | |
| Meat & Seafood | Sliced Deli Meats | meat_seafood | | |
| Meat & Seafood | Frozen Seafood | frozen | frozen_meals | |
| Meat & Seafood | Sausage | meat_seafood | pork | |
| Meat & Seafood | Chicken | meat_seafood | poultry | |
| Meat & Seafood | Meat Alternatives | meat_seafood | plant_based | |
| Meat & Seafood | Hot Dogs & Franks | meat_seafood | pork | |
| Meat & Seafood | Pork | meat_seafood | pork | |
| Meat & Seafood | Bacon | meat_seafood | pork | |
| Breads & Bakery | Breads | bakery | bread | |
| Breads & Bakery | Cakes | bakery | pastries | |
| Breads & Bakery | Pastries &Breakfast | bakery | pastries | |
| Breads & Bakery | Cookies | snacks | candy | |
| Breads & Bakery | Desserts | bakery | pastries | |
| Breads & Bakery | Bread Crumbs &Stuffing | pantry | baking | |
| Breads & Bakery | Breadsticks | snacks | crackers | |
| Deli & Prepared Foods | Entrées | frozen | frozen_meals | |
| Deli & Prepared Foods | Deli Meats &Cheeses | meat_seafood | | |
| Deli & Prepared Foods | Deli Salads | produce | vegetables | |
| Deli & Prepared Foods | Soups, Stews &Chili | pantry | canned_goods | |
| Deli & Prepared Foods | Dips, Salsas &Spreads | pantry | condiments | |
| Deli & Prepared Foods | Appetizers | frozen | frozen_meals | |
| Deli & Prepared Foods | Pasta &Sauces | pantry | pasta_rice | |
| Deli & Prepared Foods | Sandwiches &Wraps | frozen | frozen_meals | |
| Deli & Prepared Foods | Sides | frozen | frozen_meals | |
| Deli & Prepared Foods | Casseroles, Potpies &Quiches | frozen | frozen_meals | |
| Deli & Prepared Foods | Breakfast | frozen | frozen_meals | |
| Deli & Prepared Foods | Sushi | meat_seafood | seafood | |
| Deli & Prepared Foods | Meal Kits | frozen | frozen_meals | |
| Dairy, Cheese & Eggs | Cheese | dairy_eggs | cheese | |
| Dairy, Cheese & Eggs | Eggs &Egg Substitutes | dairy_eggs | eggs | |
| Dairy, Cheese & Eggs | Milk &Cream | dairy_eggs | milk | |
| Dairy, Cheese & Eggs | Yogurt | dairy_eggs | yogurt | |
| Dairy, Cheese & Eggs | Butter &Margarine | dairy_eggs | butter | |
| Dairy, Cheese & Eggs | Sour Creams | dairy_eggs | | |
| Dairy, Cheese & Eggs | Cottage Cheese | dairy_eggs | cheese | |
| Dairy, Cheese & Eggs | Cream Cheese | dairy_eggs | cheese | |
| Dairy, Cheese & Eggs | Milk Alternatives | dairy_eggs | milk | |
| Dairy, Cheese & Eggs | Whipped Toppings | dairy_eggs | | |
| Frozen Foods | Meals &Entrées | frozen | frozen_meals | |
| Frozen Foods | Vegetables | frozen | frozen_produce | |
| Frozen Foods | Pizza | frozen | frozen_meals | |
| Frozen Foods | Fruit | frozen | frozen_produce | |
| Frozen Foods | Ice Cream &Novelties | frozen | ice_cream | |
| Frozen Foods | Breakfast Foods | frozen | frozen_meals | |
| Frozen Foods | Frozen Meats | frozen | frozen_meals | |
| Frozen Foods | Bread &Dough | bakery | bread | |
| Frozen Foods | Desserts &Toppings | bakery | pastries | |
| Snacks, Chips, Salsas & Dips | Chips &Crisps | snacks | chips | |
| Snacks, Chips, Salsas & Dips | Chips &Crackers | snacks | chips | |
| Snacks, Chips, Salsas & Dips | Popcorn | snacks | chips | |
| Snacks, Chips, Salsas & Dips | Bars | snacks | | |
| Snacks, Chips, Salsas & Dips | Salsas, Dips &Spreads | pantry | condiments | |
| Snacks, Chips, Salsas & Dips | Puffed Snacks | snacks | chips | |
| Snacks, Chips, Salsas & Dips | Nuts &Seeds | snacks | | |
| Snacks, Chips, Salsas & Dips | Cookies | snacks | candy | |
| Snacks, Chips, Salsas & Dips | Dried Fruit &Raisins | snacks | | |
| Snacks, Chips, Salsas & Dips | Pretzels | snacks | crackers | |
| Snacks, Chips, Salsas & Dips | Snack &Trail Mixes | snacks | | |
| Snacks, Chips, Salsas & Dips | Crackers | snacks | crackers | |
| Snacks, Chips, Salsas & Dips | Meat Snacks | snacks | | |
| Snacks, Chips, Salsas & Dips | Candy &Chocolate | snacks | candy | |
| Snacks, Chips, Salsas & Dips | Fruit Snacks | snacks | candy | |
| Snacks, Chips, Salsas & Dips | Applesauce &Fruit Cups | snacks | | |
| Snacks, Chips, Salsas & Dips | Snack Cakes &Pastries | snacks | candy | |
| Snacks, Chips, Salsas & Dips | Seaweed Snacks | snacks | chips | |
| Snacks, Chips, Salsas & Dips | Party Mix | snacks | | |
| Snacks, Chips, Salsas & Dips | Puddings &Gelatins | snacks | | |
| Snacks, Chips, Salsas & Dips | Fruit Leathers | snacks | candy | |
| Snacks, Chips, Salsas & Dips | Vegetable Snacks | snacks | chips | |
| Snacks, Chips, Salsas & Dips | Ice Cream Cones &Toppings | frozen | ice_cream | |
| Snacks, Chips, Salsas & Dips | Breadsticks | snacks | crackers | |
| Pantry Essentials | Pasta &Noodles | pantry | pasta_rice | |
| Pantry Essentials | Condiments &Salad Dressings | pantry | condiments | |
| Pantry Essentials | Canned, Jarred &Packaged Foods | pantry | canned_goods | |
| Pantry Essentials | Cereal &Granola | pantry | | |
| Pantry Essentials | Jams, Jellies &Sweet Spreads | pantry | condiments | |
| Pantry Essentials | Spices &Seasonings | pantry | baking | |
| Pantry Essentials | Grains &Rice | pantry | pasta_rice | |
| Pantry Essentials | Soups, Stocks &Broths | pantry | canned_goods | |
| Pantry Essentials | Sauces, Gravies &Marinades | pantry | condiments | |
| Pantry Essentials | Cooking &Baking | pantry | baking | |
| Pantry Essentials | Nut &Seed Butters | pantry | condiments | |
| Pantry Essentials | Olives, Pickles &Relishes | pantry | condiments | |
| Pantry Essentials | Beans, Lentils &Peas | pantry | pasta_rice | |
| Beverages | Juices | beverages | juice | |
| Beverages | Soft Drinks | beverages | soda | |
| Beverages | Water | beverages | water | |
| Beverages | Coffee | beverages | coffee_tea | |
| Beverages | Tea | beverages | coffee_tea | |
| Beverages | Sparkling Water | beverages | water | |
| Beverages | Sports Drinks | beverages | soda | |
| Beauty | Bath &Body | health_beauty | personal_care | |
| Beauty | Oral Care | health_beauty | personal_care | |
| Beauty | Hair Care | health_beauty | personal_care | |
| Beauty | Deodorants &Shave | health_beauty | personal_care | |
| Beauty | Skin Care | health_beauty | personal_care | |
| Beauty | Hand Soap &Sanitizers | household | cleaning | |
| Beauty | First Aid | health_beauty | personal_care | |
| Beauty | Makeup &Fragrances | health_beauty | personal_care | |
| Beauty | Women 's Care | health_beauty | personal_care | |
| Beauty | Baby &Child Care | health_beauty | personal_care | |
| Household | Paper &Plastic | household | paper_products | |
| Household | Cleaning Supplies | household | cleaning | |
| Household | Laundry | household | cleaning | |
| Household | Dishwashing | household | cleaning | |
| Household | Kids &Baby Essentials | household | | |
| Household | Pet Supplies | household | pet | |
| Vitamins & Supplements | A-Z Vitamins and Supplements | health_beauty | vitamins | |
| Vitamins & Supplements | Sleep | health_beauty | vitamins | |
| Vitamins & Supplements | Vitamin C | health_beauty | vitamins | |
| Vitamins & Supplements | Protein &Sports Nutrition | health_beauty | vitamins | |
| Vitamins & Supplements | Brain &Memory | health_beauty | vitamins | |
| Vitamins & Supplements | Multivitamins | health_beauty | vitamins | |
| Vitamins & Supplements | Immunity | health_beauty | vitamins | |
| Vitamins & Supplements | Women 's Supplements | health_beauty | vitamins | |
| Vitamins & Supplements | Beauty &Collagen | health_beauty | vitamins | |
| Vitamins & Supplements | Children 's Vitamins &Supplements | health_beauty | vitamins | |
| Vitamins & Supplements | Vitamin D | health_beauty | vitamins | |
| Vitamins & Supplements | Vitamin B | health_beauty | vitamins | |
| Vitamins & Supplements | Probiotics &Gut | health_beauty | vitamins | |
| Vitamins & Supplements | Energy &Mood | health_beauty | vitamins | |
| Vitamins & Supplements | Heart | health_beauty | vitamins | |
| Vitamins & Supplements | Herbs &Mushrooms | health_beauty | vitamins | |
| Vitamins & Supplements | Superfoods, Greens &Seeds | health_beauty | vitamins | |
| Vitamins & Supplements | Vitamin E | health_beauty | vitamins | |

### Excluded Whole Foods Subcategories

- Beverages > Alcohol (Alcohol, out of scope)
- Beverages > Cocktail Mixes (Alcohol-related, out of scope)
- Beauty > Aromatherapy (Non-food, not core grocery)
- Household > Home Décor (Non-food, not core grocery)

### Python Implementation

```python
# Whole Foods Category Mapping
WHOLEFOODS_CATEGORY_MAP = {
    'Produce': {
        'Fresh Vegetables': ('produce', 'vegetables'),
        'Fresh Fruit': ('produce', 'fruit'),
        'Packaged Produce': ('produce', None),
        'Dried Fruits &Vegetables': ('snacks', None),
        'Herbs &Spices': ('pantry', 'baking'),
        'Nuts &Seeds': ('snacks', None),
        'Tofu &Plant-Based Proteins': ('meat_seafood', 'plant_based'),
    },
    'Meat & Seafood': {
        'Beef': ('meat_seafood', 'beef'),
        'Turkey': ('meat_seafood', 'poultry'),
        'Wild Game': ('meat_seafood', None),
        'Lamb': ('meat_seafood', None),
        'Seafood': ('meat_seafood', 'seafood'),
        'Packaged Cured & Deli Meats': ('meat_seafood', None),
        'Frozen Meats': ('frozen', 'frozen_meals'),
        'Sliced Deli Meats': ('meat_seafood', None),
        'Frozen Seafood': ('frozen', 'frozen_meals'),
        'Sausage': ('meat_seafood', 'pork'),
        'Chicken': ('meat_seafood', 'poultry'),
        'Meat Alternatives': ('meat_seafood', 'plant_based'),
        'Hot Dogs & Franks': ('meat_seafood', 'pork'),
        'Pork': ('meat_seafood', 'pork'),
        'Bacon': ('meat_seafood', 'pork'),
    },
    'Breads & Bakery': {
        'Breads': ('bakery', 'bread'),
        'Cakes': ('bakery', 'pastries'),
        'Pastries &Breakfast': ('bakery', 'pastries'),
        'Cookies': ('snacks', 'candy'),
        'Desserts': ('bakery', 'pastries'),
        'Bread Crumbs &Stuffing': ('pantry', 'baking'),
        'Breadsticks': ('snacks', 'crackers'),
    },
    'Deli & Prepared Foods': {
        'Entrées': ('frozen', 'frozen_meals'),
        'Deli Meats &Cheeses': ('meat_seafood', None),
        'Deli Salads': ('produce', 'vegetables'),
        'Soups, Stews &Chili': ('pantry', 'canned_goods'),
        'Dips, Salsas &Spreads': ('pantry', 'condiments'),
        'Appetizers': ('frozen', 'frozen_meals'),
        'Pasta &Sauces': ('pantry', 'pasta_rice'),
        'Sandwiches &Wraps': ('frozen', 'frozen_meals'),
        'Sides': ('frozen', 'frozen_meals'),
        'Casseroles, Potpies &Quiches': ('frozen', 'frozen_meals'),
        'Breakfast': ('frozen', 'frozen_meals'),
        'Sushi': ('meat_seafood', 'seafood'),
        'Meal Kits': ('frozen', 'frozen_meals'),
    },
    'Dairy, Cheese & Eggs': {
        'Cheese': ('dairy_eggs', 'cheese'),
        'Eggs &Egg Substitutes': ('dairy_eggs', 'eggs'),
        'Milk &Cream': ('dairy_eggs', 'milk'),
        'Yogurt': ('dairy_eggs', 'yogurt'),
        'Butter &Margarine': ('dairy_eggs', 'butter'),
        'Sour Creams': ('dairy_eggs', None),
        'Cottage Cheese': ('dairy_eggs', 'cheese'),
        'Cream Cheese': ('dairy_eggs', 'cheese'),
        'Milk Alternatives': ('dairy_eggs', 'milk'),
        'Whipped Toppings': ('dairy_eggs', None),
    },
    'Frozen Foods': {
        'Meals &Entrées': ('frozen', 'frozen_meals'),
        'Vegetables': ('frozen', 'frozen_produce'),
        'Pizza': ('frozen', 'frozen_meals'),
        'Fruit': ('frozen', 'frozen_produce'),
        'Ice Cream &Novelties': ('frozen', 'ice_cream'),
        'Breakfast Foods': ('frozen', 'frozen_meals'),
        'Frozen Meats': ('frozen', 'frozen_meals'),
        'Bread &Dough': ('bakery', 'bread'),
        'Desserts &Toppings': ('bakery', 'pastries'),
    },
    'Snacks, Chips, Salsas & Dips': {
        'Chips &Crisps': ('snacks', 'chips'),
        'Chips &Crackers': ('snacks', 'chips'),
        'Popcorn': ('snacks', 'chips'),
        'Bars': ('snacks', None),
        'Salsas, Dips &Spreads': ('pantry', 'condiments'),
        'Puffed Snacks': ('snacks', 'chips'),
        'Nuts &Seeds': ('snacks', None),
        'Cookies': ('snacks', 'candy'),
        'Dried Fruit &Raisins': ('snacks', None),
        'Pretzels': ('snacks', 'crackers'),
        'Snack &Trail Mixes': ('snacks', None),
        'Crackers': ('snacks', 'crackers'),
        'Meat Snacks': ('snacks', None),
        'Candy &Chocolate': ('snacks', 'candy'),
        'Fruit Snacks': ('snacks', 'candy'),
        'Applesauce &Fruit Cups': ('snacks', None),
        'Snack Cakes &Pastries': ('snacks', 'candy'),
        'Seaweed Snacks': ('snacks', 'chips'),
        'Party Mix': ('snacks', None),
        'Puddings &Gelatins': ('snacks', None),
        'Fruit Leathers': ('snacks', 'candy'),
        'Vegetable Snacks': ('snacks', 'chips'),
        'Ice Cream Cones &Toppings': ('frozen', 'ice_cream'),
        'Breadsticks': ('snacks', 'crackers'),
    },
    'Pantry Essentials': {
        'Pasta &Noodles': ('pantry', 'pasta_rice'),
        'Condiments &Salad Dressings': ('pantry', 'condiments'),
        'Canned, Jarred &Packaged Foods': ('pantry', 'canned_goods'),
        'Cereal &Granola': ('pantry', None),
        'Jams, Jellies &Sweet Spreads': ('pantry', 'condiments'),
        'Spices &Seasonings': ('pantry', 'baking'),
        'Grains &Rice': ('pantry', 'pasta_rice'),
        'Soups, Stocks &Broths': ('pantry', 'canned_goods'),
        'Sauces, Gravies &Marinades': ('pantry', 'condiments'),
        'Cooking &Baking': ('pantry', 'baking'),
        'Nut &Seed Butters': ('pantry', 'condiments'),
        'Olives, Pickles &Relishes': ('pantry', 'condiments'),
        'Beans, Lentils &Peas': ('pantry', 'pasta_rice'),
    },
    'Beverages': {
        'Juices': ('beverages', 'juice'),
        'Soft Drinks': ('beverages', 'soda'),
        'Water': ('beverages', 'water'),
        'Coffee': ('beverages', 'coffee_tea'),
        'Tea': ('beverages', 'coffee_tea'),
        'Sparkling Water': ('beverages', 'water'),
        'Sports Drinks': ('beverages', 'soda'),
    },
    'Beauty': {
        'Bath &Body': ('health_beauty', 'personal_care'),
        'Oral Care': ('health_beauty', 'personal_care'),
        'Hair Care': ('health_beauty', 'personal_care'),
        'Deodorants &Shave': ('health_beauty', 'personal_care'),
        'Skin Care': ('health_beauty', 'personal_care'),
        'Hand Soap &Sanitizers': ('household', 'cleaning'),
        'First Aid': ('health_beauty', 'personal_care'),
        'Makeup &Fragrances': ('health_beauty', 'personal_care'),
        "Women 's Care": ('health_beauty', 'personal_care'),
        'Baby &Child Care': ('health_beauty', 'personal_care'),
    },
    'Household': {
        'Paper &Plastic': ('household', 'paper_products'),
        'Cleaning Supplies': ('household', 'cleaning'),
        'Laundry': ('household', 'cleaning'),
        'Dishwashing': ('household', 'cleaning'),
        'Kids &Baby Essentials': ('household', None),
        'Pet Supplies': ('household', 'pet'),
    },
    'Vitamins & Supplements': {
        'A-Z Vitamins and Supplements': ('health_beauty', 'vitamins'),
        'Sleep': ('health_beauty', 'vitamins'),
        'Vitamin C': ('health_beauty', 'vitamins'),
        'Protein &Sports Nutrition': ('health_beauty', 'vitamins'),
        'Brain &Memory': ('health_beauty', 'vitamins'),
        'Multivitamins': ('health_beauty', 'vitamins'),
        'Immunity': ('health_beauty', 'vitamins'),
        "Women 's Supplements": ('health_beauty', 'vitamins'),
        'Beauty &Collagen': ('health_beauty', 'vitamins'),
        "Children 's Vitamins &Supplements": ('health_beauty', 'vitamins'),
        'Vitamin D': ('health_beauty', 'vitamins'),
        'Vitamin B': ('health_beauty', 'vitamins'),
        'Probiotics &Gut': ('health_beauty', 'vitamins'),
        'Energy &Mood': ('health_beauty', 'vitamins'),
        'Heart': ('health_beauty', 'vitamins'),
        'Herbs &Mushrooms': ('health_beauty', 'vitamins'),
        'Superfoods, Greens &Seeds': ('health_beauty', 'vitamins'),
        'Vitamin E': ('health_beauty', 'vitamins'),
    }
}

# Helper function to normalize Whole Foods category
def normalize_wholefoods_category(parent: str, subcategory: str) -> tuple[str, str | None]:
    """Map Whole Foods category to Goods taxonomy.
    
    Args:
        parent: Whole Foods parent category name
        subcategory: Whole Foods subcategory name
        
    Returns:
        Tuple of (goods_category, goods_subcategory) or ('uncategorized', None) if not found
    """
    parent_map = WHOLEFOODS_CATEGORY_MAP.get(parent, {})
    return parent_map.get(subcategory, ('uncategorized', None))
```

## Notes
- No native UPC - requires ASIN-to-UPC lookup service
- RocketSource API requires paid Scale plan
- In-store location requires Amazon authentication
- Some products may not have UPC mapping

