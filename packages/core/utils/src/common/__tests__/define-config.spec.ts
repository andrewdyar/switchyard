import { Modules } from "../../modules-sdk"
import { DEFAULT_STORE_RESTRICTED_FIELDS, defineConfig } from "../define-config"

describe("defineConfig", function () {
  it("should merge empty config with the defaults", function () {
    expect(defineConfig()).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should merge custom modules", function () {
    expect(
      defineConfig({
        modules: {
          GithubModuleService: {
            resolve: "./modules/github",
          },
        },
      })
    ).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "GithubModuleService": {
            "resolve": "./modules/github",
          },
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should merge custom modules when an array is provided", function () {
    expect(
      defineConfig({
        modules: [
          {
            resolve: require.resolve("../__fixtures__/define-config/github"),
            options: {
              apiKey: "test",
            },
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "GithubModuleService": {
            "options": {
              "apiKey": "test",
            },
            "resolve": "${require.resolve(
              "../__fixtures__/define-config/github"
            )}",
          },
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should merge custom modules when an array is provided with a key to override the module registration name", function () {
    expect(
      defineConfig({
        modules: [
          {
            key: "GithubModuleServiceOverride",
            resolve: require.resolve("../__fixtures__/define-config/github"),
            options: {
              apiKey: "test",
            },
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "GithubModuleServiceOverride": {
            "options": {
              "apiKey": "test",
            },
            "resolve": "${require.resolve(
              "../__fixtures__/define-config/github"
            )}",
          },
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should merge custom project.http config", function () {
    expect(
      defineConfig({
        projectConfig: {
          http: {
            adminCors: "http://localhost:3000",
          } as any,
        },
      })
    ).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:3000",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should include disabled modules", function () {
    expect(
      defineConfig({
        projectConfig: {
          http: {
            adminCors: "http://localhost:3000",
          } as any,
        },
        modules: {
          [Modules.CART]: false,
        },
      })
    ).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "disable": true,
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:3000",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should include cloud-based modules when in cloud execution context", function () {
    const originalEnv = { ...process.env }

    process.env.EXECUTION_CONTEXT = "medusa-cloud"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.CACHE_REDIS_URL = "redis://localhost:6379"
    process.env.S3_FILE_URL = "https://s3.amazonaws.com/medusa-cloud-test"
    process.env.S3_PREFIX = "test"
    process.env.S3_REGION = "us-east-1"
    process.env.S3_BUCKET = "medusa-cloud-test"
    process.env.S3_ENDPOINT = "https://s3.amazonaws.com"
    const res = defineConfig({})

    process.env = { ...originalEnv }

    expect(res).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/core/cache-redis",
          },
          "caching": {
            "options": {
              "providers": [
                {
                  "id": "caching-redis",
                  "is_default": true,
                  "options": {
                    "redisUrl": "redis://localhost:6379",
                  },
                  "resolve": "@switchyard/core/caching-redis",
                },
              ],
            },
            "resolve": "@switchyard/caching",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/core/event-bus-redis",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "s3",
                  "options": {
                    "authentication_method": "s3-iam-role",
                    "bucket": "medusa-cloud-test",
                    "endpoint": "https://s3.amazonaws.com",
                    "file_url": "https://s3.amazonaws.com/medusa-cloud-test",
                    "prefix": "test",
                    "region": "us-east-1",
                  },
                  "resolve": "@switchyard/core/file-s3",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "options": {
              "providers": [
                {
                  "id": "locking-redis",
                  "is_default": true,
                  "options": {
                    "redisUrl": "redis://localhost:6379",
                  },
                  "resolve": "@switchyard/core/locking-redis",
                },
              ],
            },
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "options": {
              "redis": {
                "url": "redis://localhost:6379",
              },
            },
            "resolve": "@switchyard/core/workflow-engine-redis",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "redisUrl": "redis://localhost:6379",
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should include cloud-based config with dynamo db", function () {
    const originalEnv = { ...process.env }

    process.env.EXECUTION_CONTEXT = "medusa-cloud"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.CACHE_REDIS_URL = "redis://localhost:6379"
    process.env.S3_FILE_URL = "https://s3.amazonaws.com/medusa-cloud-test"
    process.env.S3_PREFIX = "test"
    process.env.S3_REGION = "us-east-1"
    process.env.S3_BUCKET = "medusa-cloud-test"
    process.env.S3_ENDPOINT = "https://s3.amazonaws.com"
    process.env.SESSION_STORE = "dynamodb"
    const res = defineConfig({})

    process.env = { ...originalEnv }

    expect(res).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/core/cache-redis",
          },
          "caching": {
            "options": {
              "providers": [
                {
                  "id": "caching-redis",
                  "is_default": true,
                  "options": {
                    "redisUrl": "redis://localhost:6379",
                  },
                  "resolve": "@switchyard/core/caching-redis",
                },
              ],
            },
            "resolve": "@switchyard/caching",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/core/event-bus-redis",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "s3",
                  "options": {
                    "authentication_method": "s3-iam-role",
                    "bucket": "medusa-cloud-test",
                    "endpoint": "https://s3.amazonaws.com",
                    "file_url": "https://s3.amazonaws.com/medusa-cloud-test",
                    "prefix": "test",
                    "region": "us-east-1",
                  },
                  "resolve": "@switchyard/core/file-s3",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "options": {
              "providers": [
                {
                  "id": "locking-redis",
                  "is_default": true,
                  "options": {
                    "redisUrl": "redis://localhost:6379",
                  },
                  "resolve": "@switchyard/core/locking-redis",
                },
              ],
            },
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "options": {
              "redis": {
                "url": "redis://localhost:6379",
              },
            },
            "resolve": "@switchyard/core/workflow-engine-redis",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "redisUrl": "redis://localhost:6379",
          "sessionOptions": {
            "dynamodbOptions": {
              "hashKey": "id",
              "initialized": true,
              "prefix": "sess:",
              "readCapacityUnits": 5,
              "skipThrowMissingSpecialKeys": true,
              "table": "medusa-sessions",
              "writeCapacityUnits": 5,
            },
          },
        },
      }
    `)
  })

  it("should allow overriding cloud-only dynamodb config values via environment variables", function () {
    const originalEnv = { ...process.env }

    process.env.EXECUTION_CONTEXT = "medusa-cloud"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.CACHE_REDIS_URL = "redis://localhost:6379"
    process.env.S3_FILE_URL = "https://s3.amazonaws.com/medusa-cloud-test"
    process.env.S3_PREFIX = "test"
    process.env.S3_REGION = "us-east-1"
    process.env.S3_BUCKET = "medusa-cloud-test"
    process.env.S3_ENDPOINT = "https://s3.amazonaws.com"
    process.env.SESSION_STORE = "dynamodb"
    process.env.DYNAMO_DB_SESSIONS_CREATE_TABLE = "true"
    process.env.DYNAMO_DB_SESSIONS_HASH_KEY = "user_id"
    process.env.DYNAMO_DB_SESSIONS_PREFIX = "my_session:"
    process.env.DYNAMO_DB_SESSIONS_TABLE = "test-sessions"
    process.env.DYNAMO_DB_SESSIONS_READ_UNITS = "10"
    process.env.DYNAMO_DB_SESSIONS_WRITE_UNITS = "10"
    const res = defineConfig({})

    process.env = { ...originalEnv }

    expect(res).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/core/cache-redis",
          },
          "caching": {
            "options": {
              "providers": [
                {
                  "id": "caching-redis",
                  "is_default": true,
                  "options": {
                    "redisUrl": "redis://localhost:6379",
                  },
                  "resolve": "@switchyard/core/caching-redis",
                },
              ],
            },
            "resolve": "@switchyard/caching",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/core/event-bus-redis",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "s3",
                  "options": {
                    "authentication_method": "s3-iam-role",
                    "bucket": "medusa-cloud-test",
                    "endpoint": "https://s3.amazonaws.com",
                    "file_url": "https://s3.amazonaws.com/medusa-cloud-test",
                    "prefix": "test",
                    "region": "us-east-1",
                  },
                  "resolve": "@switchyard/core/file-s3",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "options": {
              "providers": [
                {
                  "id": "locking-redis",
                  "is_default": true,
                  "options": {
                    "redisUrl": "redis://localhost:6379",
                  },
                  "resolve": "@switchyard/core/locking-redis",
                },
              ],
            },
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "options": {
              "redis": {
                "url": "redis://localhost:6379",
              },
            },
            "resolve": "@switchyard/core/workflow-engine-redis",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "redisUrl": "redis://localhost:6379",
          "sessionOptions": {
            "dynamodbOptions": {
              "hashKey": "user_id",
              "initialized": false,
              "prefix": "my_session:",
              "readCapacityUnits": 10,
              "skipThrowMissingSpecialKeys": true,
              "table": "test-sessions",
              "writeCapacityUnits": 10,
            },
          },
        },
      }
    `)
  })

  it("should include default plugins", function () {
    const config = defineConfig()
    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: {} },
    ])
  })

  it("should append custom plugins to defaults", function () {
    const config = defineConfig({
      plugins: [
        { resolve: "@switchyard/custom-plugin", options: { key: "value" } },
      ],
    })
    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: {} },
      { resolve: "@switchyard/custom-plugin", options: { key: "value" } },
    ])
  })

  it("should handle multiple custom plugins", function () {
    const config = defineConfig({
      plugins: [
        { resolve: "@switchyard/plugin-one", options: { setting: "a" } },
        { resolve: "@switchyard/plugin-two", options: { setting: "b" } },
        { resolve: "./local-plugin", options: {} },
      ],
    })
    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: {} },
      { resolve: "@switchyard/plugin-one", options: { setting: "a" } },
      { resolve: "@switchyard/plugin-two", options: { setting: "b" } },
      { resolve: "./local-plugin", options: {} },
    ])
  })

  it("should merge plugins", function () {
    const config = defineConfig({
      plugins: [
        { resolve: "@switchyard/draft-order", options: { setting: "a" } },
      ],
    })
    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: { setting: "a" } },
    ])
  })

  it("should include plugins in cloud environment", function () {
    const originalEnv = { ...process.env }
    process.env.EXECUTION_CONTEXT = "medusa-cloud"

    const config = defineConfig({
      plugins: [
        { resolve: "@switchyard/cloud-plugin", options: { cloud: true } },
      ],
    })

    process.env = { ...originalEnv }

    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: {} },
      { resolve: "@switchyard/cloud-plugin", options: { cloud: true } },
    ])
  })

  it("should handle empty plugins array", function () {
    const config = defineConfig({
      plugins: [],
    })
    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: {} },
    ])
  })

  it("should handle undefined plugins", function () {
    const config = defineConfig({
      modules: {},
    })
    expect(config.plugins).toEqual([
      { resolve: "@switchyard/draft-order", options: {} },
    ])
  })

  it("should allow custom dynamodb config", function () {
    expect(
      defineConfig({
        projectConfig: {
          http: {
            adminCors: "http://localhost:3000",
          } as any,
          sessionOptions: {
            dynamodbOptions: {
              clientOptions: {
                endpoint: "http://localhost:8000",
              },
              table: "medusa-sessions",
              writeCapacityUnits: 25,
              readCapacityUnits: 25,
            },
          },
        },
      })
    ).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:3000",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {
            "dynamodbOptions": {
              "clientOptions": {
                "endpoint": "http://localhost:8000",
              },
              "readCapacityUnits": 25,
              "table": "medusa-sessions",
              "writeCapacityUnits": 25,
            },
          },
        },
      }
    `)
  })

  it("should add cloud options to the project config and relevant modules if the environment variables are set", function () {
    const originalEnv = { ...process.env }
    process.env.SWITCHYARD_CLOUD_ENVIRONMENT_HANDLE = "test-environment"
    process.env.SWITCHYARD_CLOUD_API_KEY = "test-api-key"
    process.env.SWITCHYARD_CLOUD_EMAILS_ENDPOINT = "test-emails-endpoint"
    process.env.SWITCHYARD_CLOUD_PAYMENTS_ENDPOINT = "test-payments-endpoint"
    process.env.SWITCHYARD_CLOUD_WEBHOOK_SECRET = "test-webhook-secret"
    const config = defineConfig()
    process.env = { ...originalEnv }

    expect(config).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "cloud": {
                "api_key": "test-api-key",
                "endpoint": "test-emails-endpoint",
                "environment_handle": "test-environment",
                "sandbox_handle": undefined,
              },
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "options": {
              "cloud": {
                "api_key": "test-api-key",
                "endpoint": "test-payments-endpoint",
                "environment_handle": "test-environment",
                "sandbox_handle": undefined,
                "webhook_secret": "test-webhook-secret",
              },
            },
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "cloud": {
            "apiKey": "test-api-key",
            "emailsEndpoint": "test-emails-endpoint",
            "environmentHandle": "test-environment",
            "paymentsEndpoint": "test-payments-endpoint",
            "sandboxHandle": undefined,
            "webhookSecret": "test-webhook-secret",
          },
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should add cloud options to the project config and relevant modules if the environment varianbles is set for a sandbox", function () {
    const originalEnv = { ...process.env }
    process.env.SWITCHYARD_CLOUD_SANDBOX_HANDLE = "test-sandbox"
    process.env.SWITCHYARD_CLOUD_API_KEY = "test-api-key"
    process.env.SWITCHYARD_CLOUD_EMAILS_ENDPOINT = "test-emails-endpoint"
    process.env.SWITCHYARD_CLOUD_PAYMENTS_ENDPOINT = "test-payments-endpoint"
    process.env.SWITCHYARD_CLOUD_WEBHOOK_SECRET = "test-webhook-secret"
    const config = defineConfig()
    process.env = { ...originalEnv }

    expect(config).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "cloud": {
                "api_key": "test-api-key",
                "endpoint": "test-emails-endpoint",
                "environment_handle": undefined,
                "sandbox_handle": "test-sandbox",
              },
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "options": {
              "cloud": {
                "api_key": "test-api-key",
                "endpoint": "test-payments-endpoint",
                "environment_handle": undefined,
                "sandbox_handle": "test-sandbox",
                "webhook_secret": "test-webhook-secret",
              },
            },
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "cloud": {
            "apiKey": "test-api-key",
            "emailsEndpoint": "test-emails-endpoint",
            "environmentHandle": undefined,
            "paymentsEndpoint": "test-payments-endpoint",
            "sandboxHandle": "test-sandbox",
            "webhookSecret": "test-webhook-secret",
          },
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })

  it("should merge custom projectConfig.cloud", function () {
    const originalEnv = { ...process.env }
    process.env.SWITCHYARD_CLOUD_ENVIRONMENT_HANDLE = "test-environment"
    process.env.SWITCHYARD_CLOUD_API_KEY = "test-api-key"
    process.env.SWITCHYARD_CLOUD_EMAILS_ENDPOINT = "test-emails-endpoint"
    process.env.SWITCHYARD_CLOUD_PAYMENTS_ENDPOINT = "test-payments-endpoint"
    process.env.SWITCHYARD_CLOUD_WEBHOOK_SECRET = "test-webhook-secret"
    const config = defineConfig({
      projectConfig: {
        http: {} as any,
        cloud: {
          environmentHandle: "overriden-environment",
          apiKey: "overriden-api-key",
          webhookSecret: "overriden-webhook-secret",
          emailsEndpoint: "overriden-emails-endpoint",
          paymentsEndpoint: "overriden-payments-endpoint",
        },
      },
    })
    process.env = { ...originalEnv }

    expect(config).toMatchInlineSnapshot(`
      {
        "admin": {
          "backendUrl": "/",
          "path": "/app",
        },
        "featureFlags": {},
        "logger": undefined,
        "modules": {
          "api_key": {
            "resolve": "@switchyard/core/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/core/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/core/auth",
          },
          "cache": {
            "resolve": "@switchyard/core/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/core/cart",
          },
          "currency": {
            "resolve": "@switchyard/core/currency",
          },
          "customer": {
            "resolve": "@switchyard/core/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/core/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/core/file-local",
                },
              ],
            },
            "resolve": "@switchyard/core/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/core/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/core/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/core/inventory",
          },
          "locking": {
            "resolve": "@switchyard/core/locking",
          },
          "notification": {
            "options": {
              "cloud": {
                "api_key": "overriden-api-key",
                "endpoint": "overriden-emails-endpoint",
                "environment_handle": "overriden-environment",
                "sandbox_handle": undefined,
              },
              "providers": [
                {
                  "id": "local",
                  "options": {
                    "channels": [
                      "feed",
                    ],
                    "name": "Local Notification Provider",
                  },
                  "resolve": "@switchyard/core/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/core/notification",
          },
          "order": {
            "resolve": "@switchyard/core/order",
          },
          "payment": {
            "options": {
              "cloud": {
                "api_key": "overriden-api-key",
                "endpoint": "overriden-payments-endpoint",
                "environment_handle": "overriden-environment",
                "sandbox_handle": undefined,
                "webhook_secret": "overriden-webhook-secret",
              },
            },
            "resolve": "@switchyard/core/payment",
          },
          "pricing": {
            "resolve": "@switchyard/core/pricing",
          },
          "product": {
            "resolve": "@switchyard/core/product",
          },
          "promotion": {
            "resolve": "@switchyard/core/promotion",
          },
          "region": {
            "resolve": "@switchyard/core/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/core/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/core/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/core/stock-location",
          },
          "store": {
            "resolve": "@switchyard/core/store",
          },
          "tax": {
            "resolve": "@switchyard/core/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/core/user",
          },
          "workflows": {
            "resolve": "@switchyard/core/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "cloud": {
            "apiKey": "overriden-api-key",
            "emailsEndpoint": "overriden-emails-endpoint",
            "environmentHandle": "overriden-environment",
            "paymentsEndpoint": "overriden-payments-endpoint",
            "sandboxHandle": undefined,
            "webhookSecret": "overriden-webhook-secret",
          },
          "databaseUrl": "postgres://localhost/medusa-starter-default",
          "http": {
            "adminCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "authCors": "http://localhost:7000,http://localhost:7001,http://localhost:5173",
            "cookieSecret": "supersecret",
            "jwtPublicKey": undefined,
            "jwtSecret": "supersecret",
            "restrictedFields": {
              "store": [
                ${DEFAULT_STORE_RESTRICTED_FIELDS.map((v) => `"${v}"`).join(
                  ",\n                "
                )},
              ],
            },
            "storeCors": "http://localhost:8000",
          },
          "redisOptions": {
            "retryStrategy": [Function],
          },
          "sessionOptions": {},
        },
      }
    `)
  })
})
