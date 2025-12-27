import { defineConfig, loadEnv, Modules } from "@switchyard/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Check if Supabase env vars are configured
// Note: These are injected as secrets at runtime on Fly.io, not available during Docker build
const hasSupabaseConfig = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY

// Log Supabase configuration status (helpful for debugging)
if (!hasSupabaseConfig && process.env.NODE_ENV === "production") {
  console.warn(
    "[Switchyard Config] Supabase environment variables not detected. " +
    "If this is during Docker build, this is expected. " +
    "At runtime, SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set via secrets."
  )
}

// Auth providers - Supabase only (no emailpass fallback)
const authProviders: any[] = []

if (hasSupabaseConfig) {
  // Supabase is the primary and only auth provider
  authProviders.push({
    resolve: "@switchyard/auth-supabase",
    id: "supabase",
    options: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
} else {
  // Fallback to emailpass only in development when Supabase is not configured
  console.warn("[Switchyard Config] Supabase not configured, falling back to emailpass for development")
  authProviders.push({
    resolve: "@switchyard/core/auth-emailpass",
    id: "emailpass",
  })
}

// Configure auth methods based on available providers
const userAuthMethods = authProviders.map(p => p.id)

// Build modules object - configure what modules are enabled/disabled
const modules: Record<string, any> = {
  // Auth module
  [Modules.AUTH]: {
    resolve: "@switchyard/core/auth",
    options: {
      providers: authProviders,
    },
  },
  // Custom inventory group module (additional, not replacing standard inventory)
  inventoryGroup: {
    resolve: "@switchyard/inventory-group",
  },
  // Disabled modules - using custom Supabase schema or static config instead
  [Modules.REGION]: false,        // Using locations table instead
  [Modules.CURRENCY]: false,      // Static USD
  [Modules.TAX]: false,           // Static 8.25% rate
  [Modules.FULFILLMENT]: false,   // Custom fulfillment via bags/totes/robots
  [Modules.NOTIFICATION]: false,  // Future SendGrid integration
  [Modules.STORE]: false,         // Static store config
  [Modules.SALES_CHANNEL]: false, // Single channel (app)
  [Modules.PRICING]: false,       // Using sellable_products.selling_price
  
  // Enabled modules - adapted to use Supabase schema
  // Product, Order, Cart, Customer, User, Payment, Promotion,
  // Inventory, StockLocation, API Key, File are enabled by default
}

// Add Redis-based modules for production (required for multi-instance deployments)
if (process.env.REDIS_URL) {
  // Redis Caching Module
  modules[Modules.CACHING] = {
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
  }

  // Redis Event Bus Module
  modules[Modules.EVENT_BUS] = {
    resolve: "@switchyard/core/event-bus-redis",
    options: {
      redisUrl: process.env.REDIS_URL,
      jobOptions: {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 3600, count: 1000 },
      },
    },
  }

  // Redis Workflow Engine Module
  modules[Modules.WORKFLOW_ENGINE] = {
    resolve: "@switchyard/core/workflow-engine-redis",
    options: {
      redis: {
        url: process.env.REDIS_URL,
      },
    },
  }

  // Redis Locking Module
  modules[Modules.LOCKING] = {
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
  }
}

/**
 * Static defaults (replacing disabled modules)
 * These values are used instead of the Region, Currency, Tax, and Store modules:
 * 
 * - Currency: Always USD (no currency conversion needed)
 * - Tax Rate: 8.25% Texas state tax
 * - Store: RFC 0001, en-US locale
 * - Shipping Address: 6500 N Lamar Blvd, Austin, TX 78758
 * 
 * These defaults are hardcoded in the application since we don't use the
 * corresponding modules (Region, Currency, Tax, Store).
 */
export const STATIC_DEFAULTS = {
  currency: "usd",
  taxRate: 0.0825,
  locale: "en-US",
  store: {
    name: "RFC 0001",
    default_currency_code: "usd",
    default_locale: "en-US",
  },
  shippingAddress: {
    address_1: "6500 N Lamar Blvd",
    city: "Austin",
    province: "TX",
    postal_code: "78758",
    country_code: "us",
  },
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
