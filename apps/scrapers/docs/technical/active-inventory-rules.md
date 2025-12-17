# Active Inventory Rules

This document defines the rules for determining whether an item should be considered "active inventory" in the Goods system. These rules are contextual and item-specific, not category-wide.

## Core Principle

**Default to Active**: If an item doesn't clearly match any inactive rule, it should default to **ACTIVE**.

## Inactive Item Rules

### 1. Expiration Date Rules

- **Any food with an expiration date of less than one day (24 hours from now) in the future** → **INACTIVE**
- **Shelf-stable items do not need expiration dates tracked** → **ACTIVE** (no expiration check required)

### 2. Fresh Produce Rules

**General Rule**: Fresh produce that is not shelf-stable (e.g., refrigerated produce) will **NOT** be active.

**Exceptions (ACTIVE despite being refrigerated)**:
- **Onions** → **ACTIVE**
- **Potatoes** → **ACTIVE**
- **Garlic** → **ACTIVE**
- **Berries** (blackberries, blueberries, raspberries, strawberries) → **ACTIVE** (high velocity, will be refrigerated in RFC)
- **Packaged Salad Blends** → **ACTIVE** (all packaged salad blends are acceptable)

**Fruit Rule**: Fruit is active if it doesn't need refrigeration and can be stored ambient for up to 24 hours without spoiling.

**Produce Weighing**: Produce that needs to be weighed is fine, as long as it meets other produce criteria. However, anything weighed to order (e.g., custom weighed ground beef from the counter) should not be active. Prepackaged meat/fish is okay.

### 3. Prepared/Cut-to-Order Items

**General Rule**: Anything cut or prepared to order (custom deli, fish market, meat market, etc.) will **NOT** be active.

**Includes**:
- Custom deli items (sliced to order)
- Fish market items (cut to order)
- Meat market items (cut/ground to order)
- Both on-demand and pre-made prepared food items in deli cases

**Exceptions (ACTIVE despite being prepared/packaged)**:
- **H-E-B Fresh Steamable items** (e.g., steamable broccoli, asparagus, etc.) → **ACTIVE**
- **Packaged Salad Blends** → **ACTIVE**

**Pre-packaged Cut Items**: If cut/prepared but pre-packaged (not made to order), evaluate based on expiration and storage requirements.

### 4. Weighed-to-Order Items

**Rule**: Anything weighed to order (e.g., custom weighed ground beef from the counter) should **NOT** be active.

**Prepackaged Items**: Prepackaged meat/fish is okay → **ACTIVE**

### 5. Frozen Items

**General Rule**: Frozen items are generally **ACTIVE**, with no current exceptions.

### 6. Refrigerated Items

**Rule**: Refrigerated items in all categories (dairy, deli, etc.) are evaluated the same way as produce.

**Exceptions**: See produce exceptions above (onions, potatoes, garlic, berries, packaged salad blends).

### 7. Items with Preservatives

**Rule**: Items with preservatives that extend shelf life beyond 24 hours can be **ACTIVE**.

## Edge Cases

- **Berries Exception**: Berries (blackberries, blueberries, raspberries, strawberries) are **ACTIVE** despite being refrigerated, due to high velocity. They will be refrigerated in RFC.
- **HEB Steamable Exception**: H-E-B Fresh Steamable items (e.g., steamable broccoli, asparagus, etc.) are **ACTIVE** despite being prepared/packaged items.
- **Packaged Salad Blends Exception**: All packaged salad blends are **ACTIVE** despite being prepared/packaged items.
- **Pre-packaged cut items**: If cut/prepared but pre-packaged (not made to order), evaluate based on expiration and storage requirements
- **Items with preservatives**: If a "fresh" item has preservatives extending shelf life beyond 24 hours, it can be active
- **Bulk items**: Items sold by weight that are pre-packaged are acceptable; only custom-weighed items are inactive
- **Frozen items**: Generally active, but review for special cases

## Produce Blacklist

The following produce items are **INACTIVE** (not shelf-stable, refrigerated, and not in the exception list):

*Note: This blacklist should be generated programmatically from HEB's produce products in Supabase. Items that are shelf-stable or in the exception list (onions, potatoes, garlic, berries, packaged salad blends, H-E-B Fresh Steamable items) should be excluded from this blacklist.*

**Blacklist Criteria:**
- Items in the "Fruit & vegetables" category from HEB
- Items that require refrigeration (not shelf-stable)
- Items NOT in the exception list:
  - Onions (all types: yellow, red, white, sweet, pearl, etc.)
  - Potatoes (all types: russet, red, gold, sweet, etc.)
  - Garlic (all forms: whole, peeled, minced, etc.)
  - Berries (blackberries, blueberries, raspberries, strawberries)
  - Packaged salad blends (any pre-packaged salad mix)
  - H-E-B Fresh Steamable items (broccoli, asparagus, cauliflower, etc.)

**Example Blacklisted Items:**
- Fresh leafy greens (lettuce, spinach, kale, arugula) - except packaged salad blends
- Fresh herbs (cilantro, parsley, basil, etc.) - except when shelf-stable
- Fresh cut fruit (watermelon, cantaloupe, pineapple) - except berries
- Fresh mushrooms
- Fresh asparagus - except H-E-B Fresh Steamable
- Fresh broccoli - except H-E-B Fresh Steamable
- Fresh cauliflower - except H-E-B Fresh Steamable
- Fresh Brussels sprouts - except H-E-B Fresh Steamable
- Fresh green beans - except H-E-B Fresh Steamable
- Fresh celery
- Fresh cucumbers
- Fresh tomatoes (except shelf-stable varieties)
- Fresh peppers (except shelf-stable varieties)
- Fresh corn
- Fresh fruit that requires refrigeration (except berries)

## Implementation Notes

1. **Contextual Evaluation**: Rules are item-specific, not category-wide. An item must be evaluated against all applicable rules.

2. **Default to Active**: When in doubt, default to **ACTIVE**.

3. **Expiration Tracking**: Only track expiration dates for items that require it (non-shelf-stable items). Shelf-stable items do not need expiration date tracking.

4. **Storage Requirements**: Consider both temperature requirements (refrigerated vs. ambient) and preparation status (pre-made vs. made-to-order) when determining activity status.

## Examples

### Active Items
- Shelf-stable canned goods (no expiration check needed)
- Frozen vegetables
- Onions, potatoes, garlic (shelf-stable produce)
- Berries (exception: high velocity)
- H-E-B Fresh Steamable broccoli (exception: prepared but acceptable)
- Packaged salad blends (exception: prepared but acceptable)
- Prepackaged meat/fish
- Items with preservatives extending shelf life >24 hours

### Inactive Items
- Food with expiration <24 hours
- Refrigerated produce (except exceptions: onions, potatoes, garlic, berries, packaged salad blends)
- Custom deli items (sliced to order)
- Fish market items (cut to order)
- Meat market items (cut/ground to order)
- Custom weighed items (weighed to order)
- Pre-made prepared food items in deli cases (made to order)

