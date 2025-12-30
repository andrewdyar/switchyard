/**
 * VariantGroup Model - Maps to Supabase variant_groups table
 * 
 * Groups related sellable_products together as variants (e.g., different sizes of Coke).
 */

import { model } from "@switchyard/framework/utils"
import VariantGroupMember from "./variant-group-member"

const VariantGroup = model
  .define(
    {
      tableName: "variant_groups",
      name: "VariantGroup",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Group name (e.g., "Coca-Cola")
      name: model.text().searchable(),
      
      // Brand (e.g., "Coca-Cola Company")
      brand: model.text().searchable().nullable(),
      
      // Description
      description: model.text().nullable(),
      
      // Group image
      image_url: model.text().nullable(),
      
      // Members (related sellable_products)
      members: model.hasMany(() => VariantGroupMember, {
        mappedBy: "variant_group",
      }),
    }
  )
  .cascades({
    delete: ["members"],
  })
  .indexes([
    {
      name: "IDX_variant_groups_name",
      on: ["name"],
    },
    {
      name: "IDX_variant_groups_brand",
      on: ["brand"],
      where: "brand IS NOT NULL",
    },
  ])

export { VariantGroup }
export default VariantGroup
