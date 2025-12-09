# Stage 1: Build
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy all package.json files for workspace resolution
COPY packages/package.json ./packages/package.json 2>/dev/null || true
COPY packages/*/package.json ./packages/
COPY packages/*/*/package.json ./packages/*/
COPY apps/*/package.json ./apps/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code (only what's needed for build)
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./
COPY _tsconfig.base.json ./
COPY turbo.json ./
COPY medusa-config.ts ./
COPY src ./src

# Build all packages
RUN yarn build

# Build Medusa admin
RUN npx medusa build

# Stage 2: Runtime (minimal)
FROM node:18-alpine

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
COPY .yarn/plugins ./.yarn/plugins

# Copy medusa config
COPY medusa-config.ts ./
COPY tsconfig.json ./

# Copy ONLY built artifacts from builder
COPY --from=builder /app/packages/medusa/dist ./packages/medusa/dist
COPY --from=builder /app/packages/framework ./packages/framework
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/modules/*/dist ./packages/modules/
COPY --from=builder /app/.medusa ./.medusa

# Copy our custom modules
COPY --from=builder /app/packages/modules/inventory-group/dist ./packages/modules/inventory-group/dist
COPY --from=builder /app/packages/modules/goods-*/dist ./packages/modules/goods-*/dist

# Copy all package.json files (needed for module resolution)
COPY --from=builder /app/packages/medusa/package.json ./packages/medusa/
COPY --from=builder /app/packages/modules/*/package.json ./packages/modules/
COPY --from=builder /app/packages/core/*/package.json ./packages/core/
COPY --from=builder /app/packages/framework/*/package.json ./packages/framework/

# Install ONLY production dependencies (much smaller)
ENV NODE_ENV=production
RUN yarn workspaces focus @medusajs/medusa --production || yarn install --production

# Expose port
EXPOSE 9000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start with increased memory
CMD ["node", "--max-old-space-size=768", "node_modules/.bin/medusa", "start"]

