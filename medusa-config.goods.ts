/**
 * Medusa Configuration for Goods Grocery
 * 
 * This configuration connects Medusa to the Goods Supabase database
 * and registers all custom Goods modules.
 */

import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // SSL configuration for Supabase
    databaseDriverOptions: {
      connection: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    },
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:9001",
      authCors: process.env.AUTH_CORS || "http://localhost:9000,http://localhost:9001",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    // Goods custom modules
    {
      resolve: "@medusajs/goods-retailer",
    },
    {
      resolve: "@medusajs/goods-operations",
    },
    {
      resolve: "@medusajs/goods-source",
    },
    {
      resolve: "@medusajs/goods-attributes",
    },
  ],
})

