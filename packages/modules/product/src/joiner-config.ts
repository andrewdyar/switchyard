/**
 * Product Module Joiner Config - Aligned with Supabase Schema
 * 
 * ProductVariant uses stub tables in Supabase for service compatibility.
 * Actual variant functionality is handled by the VariantGroups module.
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
    ProductVariant,
  ],
  linkableKeys: {
    product_id: Product.name,
    variant_id: ProductVariant.name,
  },
  primaryKeys: ["id", "handle"],
  alias: [
    {
      name: ["product", "products"],
      entity: Product.name,
    },
    {
      name: ["product_variant", "product_variants", "variant", "variants"],
      entity: ProductVariant.name,
      args: {
        methodSuffix: "ProductVariants",
      },
    },
    {
      name: ["product_category", "product_categories", "category", "categories"],
      entity: ProductCategory.name,
      args: {
        methodSuffix: "ProductCategories",
      },
    },
  ],
})
