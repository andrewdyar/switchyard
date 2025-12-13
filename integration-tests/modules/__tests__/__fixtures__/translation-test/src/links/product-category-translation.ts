import ProductModule from "@switchyard/product"
import { defineLink } from "@switchyard/utils"
import Translation from "../modules/translation"

export default defineLink(
  ProductModule.linkable.productCategory.id,
  Translation.linkable.translation.id
)
