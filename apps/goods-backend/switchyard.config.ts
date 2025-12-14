import { defineConfig, loadEnv } from "@switchyard/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Supabase auth is mission critical - fail fast if env vars are missing
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required Supabase environment variables. " +
    "SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must all be set."
  )
}

// Auth providers - Supabase is the primary auth provider
const authProviders: any[] = [
  {
    resolve: "@switchyard/core/auth-emailpass",
    id: "emailpass",
  },
  {
    resolve: "@switchyard/auth-supabase",
    id: "supabase",
    options: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  },
]

// Configure auth methods based on available providers
const userAuthMethods = authProviders.map(p => p.id)

// Build modules list - add Redis modules for production if REDIS_URL is configured
const modules: any[] = [
  {
    resolve: "@switchyard/inventory-group",
  },
  {
    resolve: "@switchyard/core/auth",
    options: {
      providers: authProviders,
    },
  },
]

// Add Redis-based modules for production (required for multi-instance deployments)
if (process.env.REDIS_URL) {
  // Redis Caching Module
  modules.push({
    resolve: "@switchyard/core/caching",
    options: {
      providers: [
        {
          resolve: "@switchyard/caching-redis",
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
    resolve: "@switchyard/core/event-bus-redis",
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
    resolve: "@switchyard/core/workflow-engine-redis",
    options: {
      redis: {
        url: process.env.REDIS_URL,
      },
    },
  })

  // Redis Locking Module
  modules.push({
    resolve: "@switchyard/core/locking",
    options: {
      providers: [
        {
          resolve: "@switchyard/core/locking-redis",
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

