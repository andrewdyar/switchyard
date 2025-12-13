import {
  BatchMethodResponse,
  BatchResponse,
  HttpTypes,
  LinkDefinition,
  SwitchyardContainer,
  PriceDTO,
  ProductDTO,
  ProductVariantDTO,
} from "@switchyard/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  promiseAll,
  remoteQueryObjectFromString,
} from "@switchyard/framework/utils"
import { AdminBatchVariantInventoryItemsType } from "./validators"

const isPricing = (fieldName: string) =>
  fieldName.startsWith("variants.prices") ||
  fieldName.startsWith("*variants.prices") ||
  fieldName.startsWith("prices") ||
  fieldName.startsWith("*prices")

// Decode HTML entities in strings (e.g., &#39; -> ', &amp; -> &)
const decodeHtmlEntities = (str: string | null | undefined): string | null | undefined => {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

// Map Switchyard API field names to Goods database column names
const mapProductFieldToColumn = (field: string): string => {
  // Map title -> name (source_products uses 'name' not 'title')
  if (field === 'title') return 'name'
  if (field === '*title') return '*name'
  // Map thumbnail -> image_url (source_products uses 'image_url' not 'thumbnail')
  if (field === 'thumbnail') return 'image_url'
  if (field === '*thumbnail') return '*image_url'
  return field
}

// The variant had prices before, but that is not part of the price_set money amounts. Do we remap the request and response or not?
export const remapKeysForProduct = (selectFields: string[]) => {
  const productFields = selectFields.filter(
    (fieldName: string) => !isPricing(fieldName)
  )

  const pricingFields = selectFields
    .filter((fieldName: string) => isPricing(fieldName))
    .map((fieldName: string) =>
      fieldName.replace("variants.prices.", "variants.price_set.prices.")
    )

  // Map API field names to database column names
  const remappedProductFields = productFields.map(mapProductFieldToColumn)

  return [...remappedProductFields, ...pricingFields]
}

// Map Switchyard API variant field names to Goods database column names
const mapVariantFieldToColumn = (field: string): string => {
  // Map title -> customer_friendly_size (product_skus uses 'customer_friendly_size' not 'title')
  if (field === 'title') return 'customer_friendly_size'
  if (field === '*title') return '*customer_friendly_size'
  // Map sku -> sku_id (product_skus uses 'sku_id' not 'sku')
  if (field === 'sku') return 'sku_id'
  if (field === '*sku') return '*sku_id'
  return field
}

export const remapKeysForVariant = (selectFields: string[]) => {
  const variantFields = selectFields.filter(
    (fieldName: string) => !isPricing(fieldName)
  )

  const pricingFields = selectFields
    .filter((fieldName: string) => isPricing(fieldName))
    .map((fieldName: string) =>
      fieldName.replace("prices.", "price_set.prices.")
    )

  // Map API field names to database column names
  const remappedVariantFields = variantFields.map(mapVariantFieldToColumn)

  return [...remappedVariantFields, ...pricingFields]
}

export const remapProductResponse = (
  product: ProductDTO
): HttpTypes.AdminProduct => {
  // Map Goods database fields to Switchyard API fields
  const { name, image_url, description, ...rest } = product as any
  const title = decodeHtmlEntities(name || (product as any).title)
  const decodedDescription = decodeHtmlEntities(description)
  
  return {
    ...rest,
    title, // Map 'name' to 'title' for API compatibility, decode HTML entities
    description: decodedDescription,
    thumbnail: image_url || (product as any).thumbnail, // Map 'image_url' to 'thumbnail' for API compatibility
    variants: product.variants?.map(remapVariantResponse),
    // TODO: Remove any once all typings are cleaned up
  } as any
}

export const remapVariantResponse = (
  variant: ProductVariantDTO
): HttpTypes.AdminProductVariant => {
  if (!variant) {
    return variant
  }

  // Map Goods database fields to Switchyard API fields
  const { sku_id, customer_friendly_size, ...rest } = variant as any
  const resp = {
    ...rest,
    sku: sku_id || (variant as any).sku, // Map 'sku_id' to 'sku' for API compatibility
    title: customer_friendly_size || (variant as any).title, // Map 'customer_friendly_size' to 'title' for API compatibility
    prices: (variant as any).price_set?.prices?.map((price) => ({
      id: price.id,
      amount: price.amount,
      currency_code: price.currency_code,
      min_quantity: price.min_quantity,
      max_quantity: price.max_quantity,
      variant_id: variant.id,
      created_at: price.created_at,
      updated_at: price.updated_at,
      rules: buildRules(price),
    })),
  }

  delete (resp as any).price_set

  // TODO: Remove any once all typings are cleaned up
  return resp as any
}

export const buildRules = (price: PriceDTO) => {
  const rules: Record<string, string> = {}

  for (const priceRule of price.price_rules || []) {
    const ruleAttribute = priceRule.attribute

    if (ruleAttribute) {
      rules[ruleAttribute] = priceRule.value
    }
  }

  return rules
}

export const refetchVariant = async (
  variantId: string,
  scope: SwitchyardContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "product_variant",
    variables: {
      filters: { id: variantId },
    },
    fields: remapKeysForVariant(fields ?? []),
  })

  const [variant] = await remoteQuery(queryObject)

  return remapVariantResponse(variant)
}

export const refetchBatchProducts = async (
  batchResult: BatchMethodResponse<ProductDTO>,
  scope: SwitchyardContainer,
  fields: string[]
): Promise<BatchResponse<ProductDTO>> => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  let created = Promise.resolve<ProductDTO[]>([])
  let updated = Promise.resolve<ProductDTO[]>([])

  if (batchResult.created.length) {
    const createdQuery = remoteQueryObjectFromString({
      entryPoint: "product",
      variables: {
        filters: { id: batchResult.created.map((p) => p.id) },
      },
      fields: remapKeysForProduct(fields ?? []),
    })

    created = remoteQuery(createdQuery)
  }

  if (batchResult.updated.length) {
    const updatedQuery = remoteQueryObjectFromString({
      entryPoint: "product",
      variables: {
        filters: { id: batchResult.updated.map((p) => p.id) },
      },
      fields: remapKeysForProduct(fields ?? []),
    })

    updated = remoteQuery(updatedQuery)
  }

  const [createdRes, updatedRes] = await promiseAll([created, updated])
  return {
    created: createdRes,
    updated: updatedRes,
    deleted: {
      ids: batchResult.deleted,
      object: "product",
      deleted: true,
    },
  }
}

export const refetchBatchVariants = async (
  batchResult: BatchMethodResponse<ProductVariantDTO>,
  scope: SwitchyardContainer,
  fields: string[]
): Promise<BatchResponse<ProductVariantDTO>> => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  let created = Promise.resolve<ProductVariantDTO[]>([])
  let updated = Promise.resolve<ProductVariantDTO[]>([])

  if (batchResult.created.length) {
    const createdQuery = remoteQueryObjectFromString({
      entryPoint: "variant",
      variables: {
        filters: { id: batchResult.created.map((v) => v.id) },
      },
      fields: remapKeysForVariant(fields ?? []),
    })

    created = remoteQuery(createdQuery)
  }

  if (batchResult.updated.length) {
    const updatedQuery = remoteQueryObjectFromString({
      entryPoint: "variant",
      variables: {
        filters: { id: batchResult.updated.map((v) => v.id) },
      },
      fields: remapKeysForVariant(fields ?? []),
    })

    updated = remoteQuery(updatedQuery)
  }

  const [createdRes, updatedRes] = await promiseAll([created, updated])
  return {
    created: createdRes,
    updated: updatedRes,
    deleted: {
      ids: batchResult.deleted,
      object: "variant",
      deleted: true,
    },
  }
}

export const buildBatchVariantInventoryData = (
  inputs:
    | AdminBatchVariantInventoryItemsType["create"]
    | AdminBatchVariantInventoryItemsType["update"]
    | AdminBatchVariantInventoryItemsType["delete"]
) => {
  const results: LinkDefinition[] = []

  for (const input of inputs || []) {
    const result: LinkDefinition = {
      [Modules.PRODUCT]: { variant_id: input.variant_id },
      [Modules.INVENTORY]: {
        inventory_item_id: input.inventory_item_id,
      },
    }

    if ("required_quantity" in input) {
      result.data = {
        required_quantity: input.required_quantity,
      }
    }

    results.push(result)
  }

  return results
}
