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
  [Modules.ANALYTICS]: "@switchyard/core/analytics",
  [Modules.AUTH]: "@switchyard/core/auth",
  [Modules.CACHE]: "@switchyard/core/cache-inmemory",
  [Modules.CART]: "@switchyard/core/cart",
  [Modules.CUSTOMER]: "@switchyard/core/customer",
  [Modules.EVENT_BUS]: "@switchyard/core/event-bus-local",
  [Modules.INVENTORY]: "@switchyard/core/inventory",
  [Modules.LINK]: "@switchyard/core/link-modules",
  [Modules.PAYMENT]: "@switchyard/core/payment",
  [Modules.PRICING]: "@switchyard/core/pricing",
  [Modules.PRODUCT]: "@switchyard/core/product",
  [Modules.PROMOTION]: "@switchyard/core/promotion",
  [Modules.SALES_CHANNEL]: "@switchyard/core/sales-channel",
  [Modules.FULFILLMENT]: "@switchyard/core/fulfillment",
  [Modules.STOCK_LOCATION]: "@switchyard/core/stock-location",
  [Modules.TAX]: "@switchyard/core/tax",
  [Modules.USER]: "@switchyard/core/user",
  [Modules.WORKFLOW_ENGINE]: "@switchyard/core/workflow-engine-inmemory",
  [Modules.REGION]: "@switchyard/core/region",
  [Modules.ORDER]: "@switchyard/core/order",
  [Modules.API_KEY]: "@switchyard/core/api-key",
  [Modules.STORE]: "@switchyard/core/store",
  [Modules.CURRENCY]: "@switchyard/core/currency",
  [Modules.FILE]: "@switchyard/core/file",
  [Modules.NOTIFICATION]: "@switchyard/core/notification",
  [Modules.INDEX]: "@switchyard/core/index-module",
  [Modules.LOCKING]: "@switchyard/core/locking",
  [Modules.SETTINGS]: "@switchyard/core/settings",
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
  [Modules.EVENT_BUS]: "@switchyard/core/event-bus-redis",
  [Modules.CACHE]: "@switchyard/core/cache-redis",
  [Modules.WORKFLOW_ENGINE]: "@switchyard/core/workflow-engine-redis",
  [Modules.LOCKING]: "@switchyard/core/locking-redis",
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
