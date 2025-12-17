# =============================================================================
# Production Dockerfile for Switchyard Application
# =============================================================================
# Optimized for Docker layer caching - dependencies cached separately from source
# =============================================================================

FROM node:20-bullseye-slim AS base

# Create app directory
WORKDIR /app

# =============================================================================
# Stage 1: Install dependencies (CACHED unless package.json files change)
# =============================================================================
FROM base AS deps

# Copy only package manifests for dependency resolution
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY .yarn/patches .yarn/patches

# Copy workspace configuration
COPY turbo.json tsconfig.json _tsconfig.base.json ./

# Copy only package.json files from workspaces (not source code)
# This creates a sparse copy for dependency resolution
COPY packages/admin/admin-bundler/package.json packages/admin/admin-bundler/
COPY packages/admin/admin-sdk/package.json packages/admin/admin-sdk/
COPY packages/admin/admin-shared/package.json packages/admin/admin-shared/
COPY packages/admin/admin-vite-plugin/package.json packages/admin/admin-vite-plugin/
COPY packages/admin/dashboard/package.json packages/admin/dashboard/
COPY packages/admin/goods-admin-extensions/package.json packages/admin/goods-admin-extensions/
COPY packages/core/core/package.json packages/core/core/
COPY packages/core/framework/package.json packages/core/framework/
COPY packages/core/js-sdk/package.json packages/core/js-sdk/
COPY packages/core/link-modules/package.json packages/core/link-modules/
COPY packages/core/orchestration/package.json packages/core/orchestration/
COPY packages/core/telemetry/package.json packages/core/telemetry/
COPY packages/core/types/package.json packages/core/types/
COPY packages/core/utils/package.json packages/core/utils/
COPY packages/core/workflows-sdk/package.json packages/core/workflows-sdk/
COPY packages/design-system/icons/package.json packages/design-system/icons/
COPY packages/design-system/ui/package.json packages/design-system/ui/
COPY packages/design-system/ui-preset/package.json packages/design-system/ui-preset/
COPY packages/modules/api-keys/package.json packages/modules/api-keys/
COPY packages/modules/caching/package.json packages/modules/caching/
COPY packages/modules/drivers/package.json packages/modules/drivers/
COPY packages/modules/event-bus-local/package.json packages/modules/event-bus-local/
COPY packages/modules/event-bus-redis/package.json packages/modules/event-bus-redis/
COPY packages/modules/file-local/package.json packages/modules/file-local/
COPY packages/modules/file-s3/package.json packages/modules/file-s3/
COPY packages/modules/inventory-group/package.json packages/modules/inventory-group/
COPY packages/modules/locking/package.json packages/modules/locking/
COPY packages/modules/notification/package.json packages/modules/notification/
COPY packages/modules/notification-local/package.json packages/modules/notification-local/
COPY packages/modules/notification-sendgrid/package.json packages/modules/notification-sendgrid/
COPY packages/modules/payment-stripe/package.json packages/modules/payment-stripe/
COPY packages/modules/picking/package.json packages/modules/picking/
COPY packages/modules/providers/package.json packages/modules/providers/
COPY packages/modules/sweeps/package.json packages/modules/sweeps/
COPY packages/modules/workflow-engine-inmemory/package.json packages/modules/workflow-engine-inmemory/
COPY packages/modules/workflow-engine-redis/package.json packages/modules/workflow-engine-redis/
COPY packages/medusa-cli/package.json packages/medusa-cli/
COPY packages/medusa-oas-cli/package.json packages/medusa-oas-cli/
COPY packages/medusa-telemetry/package.json packages/medusa-telemetry/
COPY apps/goods-backend/package.json apps/goods-backend/

# Enable corepack and install dependencies
RUN corepack enable && \
    yarn install --inline-builds

# =============================================================================
# Stage 2: Build (copies source and builds)
# =============================================================================
FROM deps AS builder

# Copy all source code (this layer rebuilds when source changes)
COPY packages ./packages
COPY apps ./apps

# Set build environment
ENV NODE_ENV=production

# Supabase environment variables for Vite build (frontend)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build all packages with turbo (uses caching)
RUN yarn build

# Build Switchyard backend and admin
RUN cd apps/goods-backend && npx switchyard build

# Verify and prepare admin build
RUN cd apps/goods-backend && \
    if [ -d "dist/public/admin" ]; then \
      mkdir -p public/admin && \
      cp -r dist/public/admin/* public/admin/; \
    fi && \
    if [ -f "public/admin/index.html" ] && [ -f "public/admin/entry.js" ]; then \
      sed -i 's|src="./entry.jsx"|src="/app/entry.js"|g' public/admin/index.html && \
      sed -i 's|src="/app/entry.jsx"|src="/app/entry.js"|g' public/admin/index.html; \
    fi

# =============================================================================
# Stage 3: Production runtime (minimal image)
# =============================================================================
FROM base AS runner

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/goods-backend ./apps/goods-backend

WORKDIR /app/apps/goods-backend

# Production environment
ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["npx", "switchyard", "start", "--host", "0.0.0.0"]
