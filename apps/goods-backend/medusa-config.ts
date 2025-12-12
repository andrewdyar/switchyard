import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

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
        user: ["supabase", "emailpass"],
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
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "@medusajs/auth-supabase",
            id: "supabase",
            options: {
              supabaseUrl: process.env.SUPABASE_URL,
              supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
              supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        ],
      },
    },
  ],
  plugins: [],
})

