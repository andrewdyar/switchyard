import { defineJoinerConfig } from "@switchyard/framework/utils"
import { VariantGroup, VariantGroupMember } from "./models"

export const joinerConfig = defineJoinerConfig("variantGroups", {
  linkableKeys: {
    variant_group_id: VariantGroup.name,
    sellable_product_id: "Product",
  },
  primaryKeys: ["id"],
  alias: [
    {
      name: ["variant_group", "variant_groups"],
      entity: VariantGroup.name,
    },
    {
      name: ["variant_group_member", "variant_group_members"],
      entity: VariantGroupMember.name,
    },
  ],
})
