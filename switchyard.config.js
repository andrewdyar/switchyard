/**
 * Medusa Configuration for Goods Grocery
 * 
 * This configuration connects Medusa to the Goods Supabase database.
 */

const { loadEnv, defineConfig } = require("./packages/core/utils/dist")

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // SSL and pool configuration for Supabase Pooler
    databaseDriverOptions: {
      connection: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
      pool: {
        min: 0,
        max: 3,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
      },
    },
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:5173,http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:5173,http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@switchyard/inventory-group",
      options: {},
    },
  ],
})
