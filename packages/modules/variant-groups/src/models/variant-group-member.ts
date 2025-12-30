/**
 * VariantGroupMember Model - Maps to Supabase variant_group_members table
 * 
 * Links a sellable_product to a variant_group with metadata.
 */

import { model } from "@switchyard/framework/utils"

const VariantGroupMember = model
  .define(
    {
      tableName: "variant_group_members",
      name: "VariantGroupMember",
    },
    {
      // Primary key
      id: model.id().primaryKey(),
      
      // Variant group reference
      variant_group_id: model.text(),
      
      // Sellable product reference
      sellable_product_id: model.text(),
      
      // Is this the default variant to show?
      is_default: model.boolean().default(false),
      
      // Display order within the group
      display_order: model.number().default(0),
      
      // Label for this variant (e.g., "12 oz", "2 Liter")
      variant_label: model.text().nullable(),
      
      // Relationship to variant group (forward reference)
      variant_group: model.belongsTo(() => require("./variant-group").default, {
        mappedBy: "members",
      }),
    }
  )
  .indexes([
    {
      name: "IDX_variant_group_members_group_id",
      on: ["variant_group_id"],
    },
    {
      name: "IDX_variant_group_members_product_id",
      on: ["sellable_product_id"],
    },
    {
      name: "IDX_variant_group_members_unique",
      on: ["variant_group_id", "sellable_product_id"],
      unique: true,
    },
  ])

export { VariantGroupMember }
export default VariantGroupMember
