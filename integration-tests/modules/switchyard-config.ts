import { defineConfig } from "@switchyard/utils"

const { Modules } = require("@switchyard/utils")

const DB_HOST = process.env.DB_HOST
const DB_USERNAME = process.env.DB_USERNAME
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_NAME = process.env.DB_TEMP_NAME
const DB_URL = `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`
process.env.POSTGRES_URL = DB_URL
process.env.LOG_LEVEL = "error"

const customTaxProviderRegistration = {
  resolve: {
    services: [require("@switchyard/tax/dist/providers/system").default],
  },
  id: "system_2",
}

const customPaymentProvider = {
  resolve: {
    services: [require("@switchyard/payment/dist/providers/system").default],
  },
  id: "default_2",
}

const customFulfillmentProvider = {
  resolve: "@switchyard/fulfillment-manual",
  id: "test-provider",
}

const customFulfillmentProviderCalculated = {
  resolve: require("./dist/utils/providers/fulfillment-manual-calculated")
    .default,
  id: "test-provider-calculated",
}

module.exports = defineConfig({
  admin: {
    disable: true,
  },
  plugins: [],
  projectConfig: {
    databaseUrl: DB_URL,
    databaseType: "postgres",
    http: {
      jwtSecret: "test",
      cookieSecret: "test",
    },
  },
  featureFlags: {},
  modules: [
    {
      key: "testingModule",
      resolve: "__tests__/__fixtures__/testing-module",
    },
    {
      key: "auth",
      resolve: "@switchyard/auth",
      options: {
        providers: [
          {
            id: "emailpass",
            resolve: "@switchyard/auth-emailpass",
          },
        ],
      },
    },
    {
      key: Modules.USER,
      scope: "internal",
      resolve: "@switchyard/user",
      options: {
        jwt_secret: "test",
      },
    },
    {
      key: Modules.CACHE,
      resolve: "@switchyard/cache-inmemory",
      options: { ttl: 0 }, // Cache disabled
    },
    {
      key: Modules.LOCKING,
      resolve: "@switchyard/locking",
    },
    {
      key: Modules.STOCK_LOCATION,
      resolve: "@switchyard/stock-location",
      options: {},
    },
    {
      key: Modules.INVENTORY,
      resolve: "@switchyard/inventory",
      options: {},
    },
    {
      key: Modules.PRODUCT,
      resolve: "@switchyard/product",
    },
    {
      key: Modules.PRICING,
      resolve: "@switchyard/pricing",
    },
    {
      key: Modules.PROMOTION,
      resolve: "@switchyard/promotion",
    },
    {
      key: Modules.REGION,
      resolve: "@switchyard/region",
    },
    {
      key: Modules.CUSTOMER,
      resolve: "@switchyard/customer",
    },
    {
      key: Modules.SALES_CHANNEL,
      resolve: "@switchyard/sales-channel",
    },
    {
      key: Modules.CART,
      resolve: "@switchyard/cart",
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: "@switchyard/workflow-engine-inmemory",
    },
    {
      key: Modules.API_KEY,
      resolve: "@switchyard/api-key",
    },
    {
      key: Modules.STORE,
      resolve: "@switchyard/store",
    },
    {
      key: Modules.TAX,
      resolve: "@switchyard/tax",
      options: {
        providers: [customTaxProviderRegistration],
      },
    },
    {
      key: Modules.CURRENCY,
      resolve: "@switchyard/currency",
    },
    {
      key: Modules.ORDER,
      resolve: "@switchyard/order",
    },
    {
      key: Modules.PAYMENT,
      resolve: "@switchyard/payment",
      options: {
        providers: [customPaymentProvider],
      },
    },
    {
      key: Modules.FULFILLMENT,
      resolve: "@switchyard/fulfillment",
      options: {
        providers: [
          customFulfillmentProvider,
          customFulfillmentProviderCalculated,
        ],
      },
    },
    {
      key: Modules.NOTIFICATION,
      options: {
        providers: [
          {
            resolve: "@switchyard/notification-local",
            id: "local-notification-provider",
            options: {
              name: "Local Notification Provider",
              channels: ["log", "email"],
            },
          },
        ],
      },
    },
    {
      key: Modules.INDEX,
      resolve: "@switchyard/index",
      disable: process.env.ENABLE_INDEX_MODULE !== "true",
    },
    {
      key: "brand",
      resolve: "src/modules/brand",
    },
  ],
})
