-- Migration: Fix category_id for HEB products with subcategory_id
-- Date: 2025-11-23
-- Description: For all HEB products that have a subcategory_id but missing category_id,
--              traverse up the category hierarchy to find the Level 1 parent category
--              (where level=1 and source='goods') and set category_id to that parent.

-- Step 1: Create a recursive CTE function to find the Level 1 parent category
-- This function traverses up the category hierarchy until it finds a category with level=1 and source='goods'

DO $$
DECLARE
    updated_count INTEGER := 0;
    product_record RECORD;
    level1_category_id UUID;
BEGIN
    -- Loop through all products that:
    -- 1. Have a subcategory_id
    -- 2. Are linked to HEB (via product_store_mappings)
    -- 3. Don't have a category_id OR have a category_id that needs to be updated
    FOR product_record IN
        SELECT DISTINCT p.id, p.subcategory_id
        FROM products p
        INNER JOIN product_store_mappings psm ON p.id = psm.product_id
        WHERE p.subcategory_id IS NOT NULL
          AND psm.store_name = 'heb'
          AND EXISTS (
              -- Ensure the subcategory is a 'goods' category
              SELECT 1 FROM categories c
              WHERE c.id = p.subcategory_id
                AND c.source = 'goods'
          )
    LOOP
        -- Find the Level 1 parent category by traversing up the hierarchy
        WITH RECURSIVE category_hierarchy AS (
            -- Start with the subcategory
            SELECT 
                id,
                parent_id,
                level,
                source,
                0 as depth
            FROM categories
            WHERE id = product_record.subcategory_id
            
            UNION ALL
            
            -- Recursively get parent categories
            SELECT 
                c.id,
                c.parent_id,
                c.level,
                c.source,
                ch.depth + 1
            FROM categories c
            INNER JOIN category_hierarchy ch ON c.id = ch.parent_id
            WHERE ch.level != 1 OR ch.source != 'goods'  -- Continue until we find level=1, source='goods'
        )
        SELECT id INTO level1_category_id
        FROM category_hierarchy
        WHERE level = 1 AND source = 'goods'
        ORDER BY depth ASC  -- Get the first one we encounter (should be the top-level)
        LIMIT 1;
        
        -- Update the product's category_id if we found a Level 1 parent
        IF level1_category_id IS NOT NULL THEN
            UPDATE products
            SET category_id = level1_category_id,
                updated_at = NOW()
            WHERE id = product_record.id;
            
            updated_count := updated_count + 1;
            
            -- Log progress every 1000 updates
            IF updated_count % 1000 = 0 THEN
                RAISE NOTICE 'Updated % products so far...', updated_count;
            END IF;
        ELSE
            -- Log products where we couldn't find a Level 1 parent
            RAISE WARNING 'Could not find Level 1 parent for product % with subcategory_id %', 
                product_record.id, product_record.subcategory_id;
        END IF;
        
        -- Reset for next iteration
        level1_category_id := NULL;
    END LOOP;
    
    RAISE NOTICE 'Migration complete: Updated category_id for % HEB products', updated_count;
END $$;

-- Step 2: Verify the migration results
-- Show summary of products by category level
SELECT 
    CASE 
        WHEN c.level = 1 THEN 'Level 1 (Top-level)'
        WHEN c.level = 2 THEN 'Level 2'
        WHEN c.level = 3 THEN 'Level 3'
        WHEN c.level = 4 THEN 'Level 4'
        ELSE 'Other'
    END as category_level,
    COUNT(DISTINCT p.id) as product_count
FROM products p
INNER JOIN product_store_mappings psm ON p.id = psm.product_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE psm.store_name = 'heb'
  AND p.subcategory_id IS NOT NULL
GROUP BY c.level
ORDER BY c.level;




