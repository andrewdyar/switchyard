"""
Category Lookup Helper for Supabase Integration

Maps snake_case category names from scrapers to Supabase category UUIDs.
This is the bridge between category_mapping.py output and Supabase storage.

The category names in Supabase EXACTLY match docs/technical/category-mapping.md
"""

# Snake_case to Title Case mapping for categories
# Maps the output of normalize_category() to Supabase category names
CATEGORY_NAME_MAP = {
    # Top-level categories
    'baby_kids': 'Baby & kids',
    'bakery_bread': 'Bakery & bread',
    'beverages': 'Beverages',
    'dairy_eggs': 'Dairy & eggs',
    'deli_prepared_food': 'Deli & prepared food',
    'everyday_essentials': 'Everyday essentials',
    'frozen_food': 'Frozen food',
    'fruit_vegetables': 'Fruit & vegetables',
    'health_beauty': 'Health & beauty',
    'meat_seafood': 'Meat & seafood',
    'pantry': 'Pantry',
    'pets': 'Pets',
    'uncategorized': 'Uncategorized',
}

SUBCATEGORY_NAME_MAP = {
    # Baby & kids subcategories
    'baby_safety': 'Baby safety',
    'bath_tubs_accessories': 'Bath tubs & accessories',
    'clothes': 'Clothes',
    'diapers_potty': 'Diapers & potty',
    'feeding': 'Feeding',
    'food_formula': 'Food & formula',
    'health_skin_care': 'Health & skin care',
    'nursery_kids_room': "Nursery & kids' room",
    'toys': 'Toys',
    'travel_equipment': 'Travel equipment',
    
    # Bakery & bread subcategories
    'bread': 'Bread',
    'breading_crumbs': 'Breading & crumbs',
    'cakes': 'Cakes',
    'cookies': 'Cookies',
    'desserts_pastries': 'Desserts & pastries',
    'tortillas': 'Tortillas',
    
    # Beverages subcategories
    'beer_wine': 'Beer & wine',
    'cocoa': 'Cocoa',
    'coconut_water': 'Coconut water',
    'coffee': 'Coffee',
    'coffee_creamer': 'Coffee creamer',
    'coffee_filters': 'Coffee filters',
    'ice': 'Ice',
    'juice': 'Juice',
    'mixes_flavor_enhancers': 'Mixes & flavor enhancers',
    'shakes_smoothies': 'Shakes & smoothies',
    'soda': 'Soda',
    'sports_energy_drinks': 'Sports & energy drinks',
    'tea': 'Tea',
    'water': 'Water',
    
    # Dairy & eggs subcategories
    'biscuit_cookie_dough': 'Biscuit & cookie dough',
    'butter_margarine': 'Butter & margarine',
    'cheese': 'Cheese',
    'cottage_cheese': 'Cottage cheese',
    'cream': 'Cream',
    'eggs_egg_substitutes': 'Eggs & egg substitutes',
    'milk': 'Milk',
    'pudding_gelatin': 'Pudding & gelatin',
    'sour_cream': 'Sour cream',
    'yogurt': 'Yogurt',
    
    # Deli & prepared food subcategories
    'dip': 'Dip',
    'meat': 'Meat',
    'party_trays': 'Party trays',
    'ready_meals_snacks': 'Ready meals & snacks',
    'prepared_meals': 'Prepared meals',
    'meal_kits': 'Meal kits',
    
    # Everyday essentials subcategories
    'air_fresheners_candles': 'Air fresheners & candles',
    'batteries': 'Batteries',
    'cleaners': 'Cleaners',
    'cleaning_tools': 'Cleaning tools',
    'disposable_kitchenware': 'Disposable kitchenware',
    'facial_tissue': 'Facial tissue',
    'food_storage_wraps': 'Food storage & wraps',
    'laundry': 'Laundry',
    'paper_towels': 'Paper towels',
    'toilet_paper': 'Toilet paper',
    'trash_bags': 'Trash bags',
    
    # Frozen food subcategories
    'bread_baked_goods': 'Bread & baked goods',
    'fruit': 'Fruit',
    'ice_cream_treats': 'Ice cream & treats',
    'juice_smoothies': 'Juice & smoothies',
    'meals_sides': 'Meals & sides',
    'meat_alternatives': 'Meat alternatives',
    'seafood': 'Seafood',
    'vegetables': 'Vegetables',
    
    # Fruit & vegetables subcategories
    'specialty': 'Specialty',
    
    # Health & beauty subcategories
    'bath_skin_care': 'Bath & skin care',
    'cotton_balls_swabs': 'Cotton balls & swabs',
    'diet_fitness': 'Diet & fitness',
    'eye_ear_care': 'Eye & ear care',
    'feminine_care': 'Feminine care',
    'foot_care': 'Foot care',
    'hair_care': 'Hair care',
    'home_health_care': 'Home health care',
    'incontinence': 'Incontinence',
    'makeup': 'Makeup',
    'medicines_treatments': 'Medicines & treatments',
    'nails': 'Nails',
    'oral_hygiene': 'Oral hygiene',
    'sexual_wellness': 'Sexual wellness',
    'vitamins_supplements': 'Vitamins & supplements',
    
    # Meat & seafood subcategories
    'tofu_meat_alternatives': 'Tofu & meat alternatives',
    'beef': 'Beef',
    'pork': 'Pork',
    'poultry': 'Poultry',
    'other_meat': 'Other meat',
    
    # Pantry subcategories
    'baking_ingredients': 'Baking ingredients',
    'broth_bouillon': 'Broth & bouillon',
    'canned_dried_food': 'Canned & dried food',
    'cereal_breakfast': 'Cereal & breakfast',
    'condiments': 'Condiments',
    'dressing_oil_vinegar': 'Dressing, oil & vinegar',
    'jelly_jam': 'Jelly & jam',
    'pantry_meals': 'Pantry meals',
    'pasta_rice': 'Pasta & rice',
    'peanut_butter': 'Peanut butter',
    'salsa_dip': 'Salsa & dip',
    'sauces_marinades': 'Sauces & marinades',
    'snacks_candy': 'Snacks & candy',
    'soups_chili': 'Soups & chili',
    'spices_seasonings': 'Spices & seasonings',
    'sugar_sweeteners': 'Sugar & sweeteners',
    'baby_food': 'Baby food',
    'international': 'International',
    
    # Pets subcategories
    'birds': 'Birds',
    'cats': 'Cats',
    'dogs': 'Dogs',
    'fish': 'Fish',
    'reptiles': 'Reptiles',
    'small_animals': 'Small animals',
}


def snake_to_title(snake_case: str, is_subcategory: bool = False) -> str:
    """
    Convert snake_case category name to Title Case for Supabase.
    
    Args:
        snake_case: Category name in snake_case (e.g., 'fruit_vegetables')
        is_subcategory: If True, look in subcategory map first
        
    Returns:
        Title Case name matching Supabase (e.g., 'Fruit & vegetables')
    """
    if not snake_case:
        return None
        
    # Check subcategory map first if specified
    if is_subcategory and snake_case in SUBCATEGORY_NAME_MAP:
        return SUBCATEGORY_NAME_MAP[snake_case]
    
    # Check category map
    if snake_case in CATEGORY_NAME_MAP:
        return CATEGORY_NAME_MAP[snake_case]
    
    # Check subcategory map as fallback
    if snake_case in SUBCATEGORY_NAME_MAP:
        return SUBCATEGORY_NAME_MAP[snake_case]
    
    # Return as-is if not found (may already be Title Case)
    return snake_case


def get_category_names(goods_category: str, goods_subcategory: str = None) -> tuple[str, str]:
    """
    Convert category/subcategory from normalize_category() output to Supabase names.
    
    Args:
        goods_category: Category in snake_case (e.g., 'fruit_vegetables')
        goods_subcategory: Subcategory in snake_case (e.g., 'fruit')
        
    Returns:
        Tuple of (category_name, subcategory_name) in Title Case for Supabase
    """
    category_name = snake_to_title(goods_category, is_subcategory=False)
    subcategory_name = snake_to_title(goods_subcategory, is_subcategory=True) if goods_subcategory else None
    
    return category_name, subcategory_name


# Cache for category IDs (populated on first use)
_category_id_cache = {}
_subcategory_id_cache = {}


def get_category_id(supabase_client, category_name: str) -> str:
    """
    Get Supabase UUID for a category name.
    
    Args:
        supabase_client: Supabase client instance
        category_name: Category name in Title Case (e.g., 'Fruit & vegetables')
        
    Returns:
        UUID string or None if not found
    """
    global _category_id_cache
    
    if not category_name:
        return None
    
    # Check cache
    if category_name in _category_id_cache:
        return _category_id_cache[category_name]
    
    # Query Supabase
    result = supabase_client.table('categories').select('id').eq('name', category_name).eq('level', 1).eq('source', 'goods').execute()
    
    if result.data and len(result.data) > 0:
        category_id = result.data[0]['id']
        _category_id_cache[category_name] = category_id
        return category_id
    
    return None


def get_subcategory_id(supabase_client, subcategory_name: str, parent_category_name: str) -> str:
    """
    Get Supabase UUID for a subcategory name.
    
    Args:
        supabase_client: Supabase client instance
        subcategory_name: Subcategory name in Title Case (e.g., 'Fruit')
        parent_category_name: Parent category name in Title Case
        
    Returns:
        UUID string or None if not found
    """
    global _subcategory_id_cache
    
    if not subcategory_name:
        return None
    
    cache_key = f"{parent_category_name}:{subcategory_name}"
    
    # Check cache
    if cache_key in _subcategory_id_cache:
        return _subcategory_id_cache[cache_key]
    
    # First get parent category ID
    parent_id = get_category_id(supabase_client, parent_category_name)
    if not parent_id:
        return None
    
    # Query Supabase for subcategory
    result = supabase_client.table('categories').select('id').eq('name', subcategory_name).eq('parent_id', parent_id).eq('level', 2).eq('source', 'goods').execute()
    
    if result.data and len(result.data) > 0:
        subcategory_id = result.data[0]['id']
        _subcategory_id_cache[cache_key] = subcategory_id
        return subcategory_id
    
    return None


def get_category_ids_from_snake_case(supabase_client, goods_category: str, goods_subcategory: str = None) -> tuple[str, str]:
    """
    Convert snake_case category names to Supabase UUIDs.
    
    This is the main function to use when storing scraped products.
    
    Args:
        supabase_client: Supabase client instance
        goods_category: Category in snake_case from normalize_category()
        goods_subcategory: Subcategory in snake_case from normalize_category()
        
    Returns:
        Tuple of (category_id, subcategory_id) UUIDs
    """
    # Convert to Title Case
    category_name, subcategory_name = get_category_names(goods_category, goods_subcategory)
    
    # Get UUIDs
    category_id = get_category_id(supabase_client, category_name)
    subcategory_id = get_subcategory_id(supabase_client, subcategory_name, category_name) if subcategory_name else None
    
    return category_id, subcategory_id


def clear_cache():
    """Clear the category ID cache."""
    global _category_id_cache, _subcategory_id_cache
    _category_id_cache = {}
    _subcategory_id_cache = {}


