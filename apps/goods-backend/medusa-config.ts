import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Build auth providers list - only include Supabase if env vars are configured
const authProviders: any[] = [
  {
    resolve: "@medusajs/medusa/auth-emailpass",
    id: "emailpass",
  },
]

// Only add Supabase provider if all required env vars are present
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  authProviders.push({
    resolve: "@medusajs/auth-supabase",
    id: "supabase",
    options: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
}

// Configure auth methods based on available providers
const userAuthMethods = authProviders.map(p => p.id)

// Build modules list - add Redis modules for production if REDIS_URL is configured
const modules: any[] = [
  {
    resolve: "@medusajs/inventory-group",
  },
  {
    resolve: "@medusajs/medusa/auth",
    options: {
      providers: authProviders,
    },
  },
]

// Add Redis-based modules for production (required for multi-instance deployments)
if (process.env.REDIS_URL) {
  // Redis Caching Module
  modules.push({
    resolve: "@medusajs/medusa/caching",
    options: {
      providers: [
        {
          resolve: "@medusajs/caching-redis",
          id: "caching-redis",
          is_default: true,
          options: {
            redisUrl: process.env.REDIS_URL,
          },
        },
      ],
    },
  })

  // Redis Event Bus Module
  modules.push({
    resolve: "@medusajs/medusa/event-bus-redis",
    options: {
      redisUrl: process.env.REDIS_URL,
      jobOptions: {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 3600, count: 1000 },
      },
    },
  })

  // Redis Workflow Engine Module
  modules.push({
    resolve: "@medusajs/medusa/workflow-engine-redis",
    options: {
      redis: {
        redisUrl: process.env.REDIS_URL,
      },
    },
  })

  // Redis Locking Module
  modules.push({
    resolve: "@medusajs/medusa/locking",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/locking-redis",
          id: "locking-redis",
          is_default: true,
          options: {
            redisUrl: process.env.REDIS_URL,
          },
        },
      ],
    },
  })
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      authMethodsPerActor: {
        user: userAuthMethods,
        customer: ["emailpass"],
      },
    },
  },
  admin: {
    disable: false,
  },
  modules,
  plugins: [],
})

