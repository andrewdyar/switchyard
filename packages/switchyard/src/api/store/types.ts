import { MedusaStoreRequest } from "@switchyard/framework/http"
import {
  SwitchyardPricingContext,
  TaxCalculationContext,
} from "@switchyard/framework/types"

export type StoreRequestWithContext<
  Body,
  QueryFields = Record<string, unknown>
> = MedusaStoreRequest<Body, QueryFields> & {
  pricingContext?: SwitchyardPricingContext
  taxContext?: {
    taxLineContext?: TaxCalculationContext
    taxInclusivityContext?: {
      automaticTaxes: boolean
    }
  }
}
