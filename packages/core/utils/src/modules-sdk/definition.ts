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
  [Modules.ANALYTICS]: "@switchyard/analytics",
  [Modules.AUTH]: "@switchyard/auth",
  [Modules.CACHE]: "@switchyard/cache-inmemory",
  [Modules.CART]: "@switchyard/cart",
  [Modules.CUSTOMER]: "@switchyard/customer",
  [Modules.EVENT_BUS]: "@switchyard/event-bus-local",
  [Modules.INVENTORY]: "@switchyard/inventory",
  [Modules.LINK]: "@switchyard/link-modules",
  [Modules.PAYMENT]: "@switchyard/payment",
  [Modules.PRICING]: "@switchyard/pricing",
  [Modules.PRODUCT]: "@switchyard/product",
  [Modules.PROMOTION]: "@switchyard/promotion",
  [Modules.SALES_CHANNEL]: "@switchyard/sales-channel",
  [Modules.FULFILLMENT]: "@switchyard/fulfillment",
  [Modules.STOCK_LOCATION]: "@switchyard/stock-location",
  [Modules.TAX]: "@switchyard/tax",
  [Modules.USER]: "@switchyard/user",
  [Modules.WORKFLOW_ENGINE]: "@switchyard/workflow-engine-inmemory",
  [Modules.REGION]: "@switchyard/region",
  [Modules.ORDER]: "@switchyard/order",
  [Modules.API_KEY]: "@switchyard/api-key",
  [Modules.STORE]: "@switchyard/store",
  [Modules.CURRENCY]: "@switchyard/currency",
  [Modules.FILE]: "@switchyard/file",
  [Modules.NOTIFICATION]: "@switchyard/notification",
  [Modules.INDEX]: "@switchyard/index-module",
  [Modules.LOCKING]: "@switchyard/locking",
  [Modules.SETTINGS]: "@switchyard/settings",
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
  [Modules.EVENT_BUS]: "@switchyard/event-bus-redis",
  [Modules.CACHE]: "@switchyard/cache-redis",
  [Modules.WORKFLOW_ENGINE]: "@switchyard/workflow-engine-redis",
  [Modules.LOCKING]: "@switchyard/locking-redis",
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
