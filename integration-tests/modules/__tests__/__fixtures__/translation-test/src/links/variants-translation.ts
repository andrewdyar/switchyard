import ProductModule from "@switchyard/core/product"
import { defineLink } from "@switchyard/utils"
import Translation from "../modules/translation"

export default defineLink(
  ProductModule.linkable.productVariant.id,
  Translation.linkable.translation.id
)
