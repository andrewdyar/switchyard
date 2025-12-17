# HEB Product Fields - Expected Values

## Fields That Should Always Have Values

### ✅ Always Populated
- **`raw_data`** (JSONB): Should ALWAYS be populated with the full API response. If empty, there's a bug.
- **`name`**: Product name - always present
- **`image_url`**: Product image - should be present (may be empty string if no image)
- **`is_active`**: Boolean - always TRUE for active products

## Fields That May Be Empty (Depends on API Response)

### ⚠️ May Be Empty (API-Dependent)
- **`brand`**: May be empty if:
  - Product has no brand in API response
  - Brand name is not provided (we set to "HEB" if `isOwnBrand=true`, but if both are missing, it stays empty)
  
- **`product_page_url`**: May be empty if:
  - API doesn't provide `productPageURL` or `productPageUrl` field
  - Product doesn't have a detail page URL
  
- **`full_category_hierarchy`**: May be empty if:
  - API doesn't provide `fullCategoryHierarchy` field
  - Product is not categorized
  
- **`product_group_id`**: **NOT from HEB API** - This is a Goods-specific field for grouping related products. It's not extracted from HEB data and would need to be set manually or derived from other logic.

## Fields That Are Boolean (Default to False/True)

- **`is_new`**: Defaults to `False` if not in API
- **`on_ad`**: Defaults to `False` if not in API
- **`best_available`**: Defaults to `False` if not in API
- **`priced_by_weight`**: Defaults to `False` if not in API
- **`show_coupon_flag`**: Defaults to `False` if not in API
- **`in_assortment`**: Defaults to `True` if not in API

## Recent Fixes Applied

1. **Field Name Variations**: Now checks for multiple possible field names:
   - `productPageURL`, `productPageUrl`, `product_page_url`, `url`
   - `fullCategoryHierarchy`, `categoryPath`, `category_path`
   - `brand.name`, `brand.brandName`

2. **Conditional Storage**: Only stores fields if they have non-empty values (avoids overwriting with empty strings)

3. **Raw Data**: Always stored (should never be empty)

4. **Debug Logging**: Added logging to identify when fields are missing from API response

## What to Check

If you see empty values in Supabase:

1. **`raw_data` is empty**: This is a bug - should always be populated. Check scraper logs.

2. **`brand` is empty**: Check if API response has `brand.name` or `brand.isOwnBrand`. Some products may legitimately have no brand.

3. **`product_page_url` is empty**: Check if API response has `productPageURL` field. Some products may not have detail pages.

4. **`full_category_hierarchy` is empty**: Check if API response has `fullCategoryHierarchy` field. Some products may not be categorized.

5. **`product_group_id` is empty**: This is expected - it's not from HEB API, it's a Goods-specific field that would need to be set separately.

## Next Steps

If fields are legitimately missing from the API response, we may need to:
- Check the actual API response structure for these products
- Use alternative endpoints to fetch missing data
- Accept that some fields may be empty for certain products

