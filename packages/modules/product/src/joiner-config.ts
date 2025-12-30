/**
 * Product Module Joiner Config - Aligned with Supabase Schema
 * 
 * ProductVariant is REMOVED from registration - we use variant_groups module instead.
 * All other sub-entities now have backing tables.
 */
import { defineJoinerConfig, Modules } from "@switchyard/framework/utils"
import {
  Product,
  ProductCategory,
  ProductCollection,
  ProductImage,
  ProductOption,
  ProductOptionValue,
  ProductTag,
  ProductType,
  ProductVariant,
} from "@models"
import { default as schema } from "./schema"

export const joinerConfig = defineJoinerConfig(Modules.PRODUCT, {
  schema,
  models: [
    Product,
    ProductOption,
    ProductOptionValue,
    ProductType,
    ProductTag,
    ProductCollection,
    ProductCategory,
    ProductImage,
    // ProductVariant is kept in models for backward compatibility but not actively used
    ProductVariant,
  ],
  linkableKeys: {
    // product_id is the main linkable key for sellable_products
    product_id: Product.name,
    // Keep variant_id for backward compatibility but it won't be used
    variant_id: "ProductVariant",
  },
  primaryKeys: ["id", "handle"],
  alias: [
    // Products alias (primary)
    {
      name: ["product", "products"],
      entity: Product.name,
    },
    // Variant alias kept for backward compatibility
    {
      name: ["product_variant", "product_variants", "variant", "variants"],
      entity: "ProductVariant",
      args: {
        methodSuffix: "ProductVariants",
      },
    },
    // Category alias
    {
      name: ["product_category", "product_categories", "category", "categories"],
      entity: ProductCategory.name,
      args: {
        methodSuffix: "ProductCategories",
      },
    },
  ],
})
