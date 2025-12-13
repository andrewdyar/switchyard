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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "disable": true,
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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

    process.env.EXECUTION_CONTEXT = "switchyard-cloud"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.CACHE_REDIS_URL = "redis://localhost:6379"
    process.env.S3_FILE_URL = "https://s3.amazonaws.com/switchyard-cloud-test"
    process.env.S3_PREFIX = "test"
    process.env.S3_REGION = "us-east-1"
    process.env.S3_BUCKET = "switchyard-cloud-test"
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/cache-redis",
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
                  "resolve": "@switchyard/caching-redis",
                },
              ],
            },
            "resolve": "@switchyard/caching",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/event-bus-redis",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "s3",
                  "options": {
                    "authentication_method": "s3-iam-role",
                    "bucket": "switchyard-cloud-test",
                    "endpoint": "https://s3.amazonaws.com",
                    "file_url": "https://s3.amazonaws.com/switchyard-cloud-test",
                    "prefix": "test",
                    "region": "us-east-1",
                  },
                  "resolve": "@switchyard/file-s3",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
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
                  "resolve": "@switchyard/locking-redis",
                },
              ],
            },
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "options": {
              "redis": {
                "url": "redis://localhost:6379",
              },
            },
            "resolve": "@switchyard/workflow-engine-redis",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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

    process.env.EXECUTION_CONTEXT = "switchyard-cloud"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.CACHE_REDIS_URL = "redis://localhost:6379"
    process.env.S3_FILE_URL = "https://s3.amazonaws.com/switchyard-cloud-test"
    process.env.S3_PREFIX = "test"
    process.env.S3_REGION = "us-east-1"
    process.env.S3_BUCKET = "switchyard-cloud-test"
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/cache-redis",
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
                  "resolve": "@switchyard/caching-redis",
                },
              ],
            },
            "resolve": "@switchyard/caching",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/event-bus-redis",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "s3",
                  "options": {
                    "authentication_method": "s3-iam-role",
                    "bucket": "switchyard-cloud-test",
                    "endpoint": "https://s3.amazonaws.com",
                    "file_url": "https://s3.amazonaws.com/switchyard-cloud-test",
                    "prefix": "test",
                    "region": "us-east-1",
                  },
                  "resolve": "@switchyard/file-s3",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
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
                  "resolve": "@switchyard/locking-redis",
                },
              ],
            },
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "options": {
              "redis": {
                "url": "redis://localhost:6379",
              },
            },
            "resolve": "@switchyard/workflow-engine-redis",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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

    process.env.EXECUTION_CONTEXT = "switchyard-cloud"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.CACHE_REDIS_URL = "redis://localhost:6379"
    process.env.S3_FILE_URL = "https://s3.amazonaws.com/switchyard-cloud-test"
    process.env.S3_PREFIX = "test"
    process.env.S3_REGION = "us-east-1"
    process.env.S3_BUCKET = "switchyard-cloud-test"
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/cache-redis",
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
                  "resolve": "@switchyard/caching-redis",
                },
              ],
            },
            "resolve": "@switchyard/caching",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "options": {
              "redisUrl": "redis://localhost:6379",
            },
            "resolve": "@switchyard/event-bus-redis",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "s3",
                  "options": {
                    "authentication_method": "s3-iam-role",
                    "bucket": "switchyard-cloud-test",
                    "endpoint": "https://s3.amazonaws.com",
                    "file_url": "https://s3.amazonaws.com/switchyard-cloud-test",
                    "prefix": "test",
                    "region": "us-east-1",
                  },
                  "resolve": "@switchyard/file-s3",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
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
                  "resolve": "@switchyard/locking-redis",
                },
              ],
            },
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "options": {
              "redis": {
                "url": "redis://localhost:6379",
              },
            },
            "resolve": "@switchyard/workflow-engine-redis",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
    process.env.EXECUTION_CONTEXT = "switchyard-cloud"

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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
          },
          "payment": {
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
          },
        },
        "plugins": [
          {
            "options": {},
            "resolve": "@switchyard/draft-order",
          },
        ],
        "projectConfig": {
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
    process.env.MEDUSA_CLOUD_ENVIRONMENT_HANDLE = "test-environment"
    process.env.MEDUSA_CLOUD_API_KEY = "test-api-key"
    process.env.MEDUSA_CLOUD_EMAILS_ENDPOINT = "test-emails-endpoint"
    process.env.MEDUSA_CLOUD_PAYMENTS_ENDPOINT = "test-payments-endpoint"
    process.env.MEDUSA_CLOUD_WEBHOOK_SECRET = "test-webhook-secret"
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
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
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
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
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
    process.env.MEDUSA_CLOUD_SANDBOX_HANDLE = "test-sandbox"
    process.env.MEDUSA_CLOUD_API_KEY = "test-api-key"
    process.env.MEDUSA_CLOUD_EMAILS_ENDPOINT = "test-emails-endpoint"
    process.env.MEDUSA_CLOUD_PAYMENTS_ENDPOINT = "test-payments-endpoint"
    process.env.MEDUSA_CLOUD_WEBHOOK_SECRET = "test-webhook-secret"
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
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
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
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
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
    process.env.MEDUSA_CLOUD_ENVIRONMENT_HANDLE = "test-environment"
    process.env.MEDUSA_CLOUD_API_KEY = "test-api-key"
    process.env.MEDUSA_CLOUD_EMAILS_ENDPOINT = "test-emails-endpoint"
    process.env.MEDUSA_CLOUD_PAYMENTS_ENDPOINT = "test-payments-endpoint"
    process.env.MEDUSA_CLOUD_WEBHOOK_SECRET = "test-webhook-secret"
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
            "resolve": "@switchyard/api-key",
          },
          "auth": {
            "options": {
              "providers": [
                {
                  "id": "emailpass",
                  "resolve": "@switchyard/auth-emailpass",
                },
              ],
            },
            "resolve": "@switchyard/auth",
          },
          "cache": {
            "resolve": "@switchyard/cache-inmemory",
          },
          "cart": {
            "resolve": "@switchyard/cart",
          },
          "currency": {
            "resolve": "@switchyard/currency",
          },
          "customer": {
            "resolve": "@switchyard/customer",
          },
          "event_bus": {
            "resolve": "@switchyard/event-bus-local",
          },
          "file": {
            "options": {
              "providers": [
                {
                  "id": "local",
                  "resolve": "@switchyard/file-local",
                },
              ],
            },
            "resolve": "@switchyard/file",
          },
          "fulfillment": {
            "options": {
              "providers": [
                {
                  "id": "manual",
                  "resolve": "@switchyard/fulfillment-manual",
                },
              ],
            },
            "resolve": "@switchyard/fulfillment",
          },
          "inventory": {
            "resolve": "@switchyard/inventory",
          },
          "locking": {
            "resolve": "@switchyard/locking",
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
                  "resolve": "@switchyard/notification-local",
                },
              ],
            },
            "resolve": "@switchyard/notification",
          },
          "order": {
            "resolve": "@switchyard/order",
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
            "resolve": "@switchyard/payment",
          },
          "pricing": {
            "resolve": "@switchyard/pricing",
          },
          "product": {
            "resolve": "@switchyard/product",
          },
          "promotion": {
            "resolve": "@switchyard/promotion",
          },
          "region": {
            "resolve": "@switchyard/region",
          },
          "sales_channel": {
            "resolve": "@switchyard/sales-channel",
          },
          "settings": {
            "resolve": "@switchyard/settings",
          },
          "stock_location": {
            "resolve": "@switchyard/stock-location",
          },
          "store": {
            "resolve": "@switchyard/store",
          },
          "tax": {
            "resolve": "@switchyard/tax",
          },
          "user": {
            "options": {
              "jwt_options": undefined,
              "jwt_public_key": undefined,
              "jwt_secret": "supersecret",
              "jwt_verify_options": undefined,
            },
            "resolve": "@switchyard/user",
          },
          "workflows": {
            "resolve": "@switchyard/workflow-engine-inmemory",
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
          "databaseUrl": "postgres://localhost/switchyard-starter-default",
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
