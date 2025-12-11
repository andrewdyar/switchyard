# =============================================================================
# Stage 1: Builder - Install dependencies and build
# =============================================================================
FROM node:20-bullseye AS builder

WORKDIR /app

# Enable corepack for yarn
RUN corepack enable

# Copy package files first for better caching
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install all dependencies
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN yarn install --inline-builds

# Copy source code
COPY . .

# Build all packages in the monorepo
RUN yarn build

# Build the goods-backend medusa app
WORKDIR /app/apps/goods-backend
RUN npx medusa build

# Debug: List what was created
RUN echo "=== Build output ===" && \
    ls -la && \
    ls -la .medusa/ 2>/dev/null || echo "No .medusa" && \
    ls -la dist/ 2>/dev/null || echo "No dist"

# =============================================================================
# Stage 2: Production - Run the application
# =============================================================================
FROM node:20-bullseye-slim AS production

WORKDIR /app

# Copy the built application
# Try .medusa/server first, fallback to whole goods-backend if not exists
COPY --from=builder /app/apps/goods-backend/dist ./dist
COPY --from=builder /app/apps/goods-backend/package.json ./
COPY --from=builder /app/apps/goods-backend/.medusa ./medusa 2>/dev/null || true
COPY --from=builder /app/apps/goods-backend/public ./public 2>/dev/null || true

# Install production dependencies  
RUN npm install --production --no-audit --no-fund && npm cache clean --force

# Production environment
ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start using medusa CLI
CMD ["npx", "medusa", "start"]
