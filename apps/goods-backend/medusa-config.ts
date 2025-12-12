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

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
  modules: [
    {
      resolve: "@medusajs/inventory-group",
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: authProviders,
      },
    },
  ],
  plugins: [],
})

