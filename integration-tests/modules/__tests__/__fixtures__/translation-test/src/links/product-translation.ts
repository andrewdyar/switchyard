import { defineLink } from "@switchyard/framework/utils"
import ProductModule from "@switchyard/product"
import Translation from "../modules/translation"

export default defineLink(
  ProductModule.linkable.product.id,
  Translation.linkable.translation.id
)
