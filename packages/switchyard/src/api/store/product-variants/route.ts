import {
  AuthenticatedSwitchyardRequest,
  SwitchyardResponse,
} from "@switchyard/framework/http"
import { HttpTypes, QueryContextType } from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@switchyard/framework/utils"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "../../utils/middlewares"
import { StoreRequestWithContext } from "../types"
import { wrapVariantsWithTaxPrices } from "./helpers"

type StoreVariantListRequest =
  StoreRequestWithContext<HttpTypes.StoreProductVariantParams> &
    AuthenticatedSwitchyardRequest<HttpTypes.StoreProductVariantParams>

/**
 * @since 2.11.2
 */
export const GET = async (
  req: StoreVariantListRequest,
  res: SwitchyardResponse<HttpTypes.StoreProductVariantListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const withInventoryQuantity =
    req.queryConfig.fields.includes("inventory_quantity")

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => field !== "inventory_quantity"
    )
  }

  const context: QueryContextType = {}

  if (req.pricingContext) {
    context["calculated_price"] = QueryContext(req.pricingContext)
  }

  const { data: variants = [], metadata } = await query.graph(
    {
      entity: "variant",
      fields: req.queryConfig.fields,
      filters: req.filterableFields,
      pagination: req.queryConfig.pagination,
      context,
    },
    {
      cache: {
        enable: true,
      },
    }
  )

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(req, variants)
  }

  await wrapVariantsWithTaxPrices(req, variants)

  res.json({
    variants,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
