import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Redis is optional - if not provided, in-memory will be used
    ...(process.env.REDIS_URL && { redisUrl: process.env.REDIS_URL }),
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: false,
    // Serve pre-built admin in production
    path: "/app",
  },
  plugins: [],
})
