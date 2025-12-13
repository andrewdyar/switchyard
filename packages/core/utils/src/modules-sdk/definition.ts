export const Modules = {
  ANALYTICS: "analytics",
  AUTH: "auth",
  CACHE: "cache",
  CART: "cart",
  CUSTOMER: "customer",
  EVENT_BUS: "event_bus",
  INVENTORY: "inventory",
  LINK: "link_modules",
  PAYMENT: "payment",
  PRICING: "pricing",
  PRODUCT: "product",
  PROMOTION: "promotion",
  SALES_CHANNEL: "sales_channel",
  TAX: "tax",
  FULFILLMENT: "fulfillment",
  STOCK_LOCATION: "stock_location",
  USER: "user",
  WORKFLOW_ENGINE: "workflows",
  REGION: "region",
  ORDER: "order",
  API_KEY: "api_key",
  STORE: "store",
  CURRENCY: "currency",
  FILE: "file",
  NOTIFICATION: "notification",
  INDEX: "index",
  LOCKING: "locking",
  SETTINGS: "settings",
  CACHING: "caching",
} as const

export const MODULE_PACKAGE_NAMES = {
  [Modules.ANALYTICS]: "@switchyard/medusa/analytics",
  [Modules.AUTH]: "@switchyard/medusa/auth",
  [Modules.CACHE]: "@switchyard/medusa/cache-inmemory",
  [Modules.CART]: "@switchyard/medusa/cart",
  [Modules.CUSTOMER]: "@switchyard/medusa/customer",
  [Modules.EVENT_BUS]: "@switchyard/medusa/event-bus-local",
  [Modules.INVENTORY]: "@switchyard/medusa/inventory",
  [Modules.LINK]: "@switchyard/medusa/link-modules",
  [Modules.PAYMENT]: "@switchyard/medusa/payment",
  [Modules.PRICING]: "@switchyard/medusa/pricing",
  [Modules.PRODUCT]: "@switchyard/medusa/product",
  [Modules.PROMOTION]: "@switchyard/medusa/promotion",
  [Modules.SALES_CHANNEL]: "@switchyard/medusa/sales-channel",
  [Modules.FULFILLMENT]: "@switchyard/medusa/fulfillment",
  [Modules.STOCK_LOCATION]: "@switchyard/medusa/stock-location",
  [Modules.TAX]: "@switchyard/medusa/tax",
  [Modules.USER]: "@switchyard/medusa/user",
  [Modules.WORKFLOW_ENGINE]: "@switchyard/medusa/workflow-engine-inmemory",
  [Modules.REGION]: "@switchyard/medusa/region",
  [Modules.ORDER]: "@switchyard/medusa/order",
  [Modules.API_KEY]: "@switchyard/medusa/api-key",
  [Modules.STORE]: "@switchyard/medusa/store",
  [Modules.CURRENCY]: "@switchyard/medusa/currency",
  [Modules.FILE]: "@switchyard/medusa/file",
  [Modules.NOTIFICATION]: "@switchyard/medusa/notification",
  [Modules.INDEX]: "@switchyard/medusa/index-module",
  [Modules.LOCKING]: "@switchyard/medusa/locking",
  [Modules.SETTINGS]: "@switchyard/medusa/settings",
  [Modules.CACHING]: "@switchyard/caching",
}

export const REVERSED_MODULE_PACKAGE_NAMES = Object.entries(
  MODULE_PACKAGE_NAMES
).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {})

// TODO: temporary fix until the event bus, cache and workflow engine are migrated to use providers and therefore only a single resolution will be good
export const TEMPORARY_REDIS_MODULE_PACKAGE_NAMES = {
  [Modules.EVENT_BUS]: "@switchyard/medusa/event-bus-redis",
  [Modules.CACHE]: "@switchyard/medusa/cache-redis",
  [Modules.WORKFLOW_ENGINE]: "@switchyard/medusa/workflow-engine-redis",
  [Modules.LOCKING]: "@switchyard/medusa/locking-redis",
}

REVERSED_MODULE_PACKAGE_NAMES[
  TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.EVENT_BUS]
] = Modules.EVENT_BUS
REVERSED_MODULE_PACKAGE_NAMES[
  TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.CACHE]
] = Modules.CACHE
REVERSED_MODULE_PACKAGE_NAMES[
  TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.WORKFLOW_ENGINE]
] = Modules.WORKFLOW_ENGINE
REVERSED_MODULE_PACKAGE_NAMES[
  TEMPORARY_REDIS_MODULE_PACKAGE_NAMES[Modules.LOCKING]
] = Modules.LOCKING

/**
 * Making modules be referenced as a type as well.
 */
export type Modules = (typeof Modules)[keyof typeof Modules]
export const ModuleRegistrationName = Modules
