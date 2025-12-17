# =============================================================================
# Production Dockerfile for Switchyard Application
# =============================================================================
# Multi-stage build optimized for Docker layer caching
# Dependencies are cached unless package.json files change
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Extract package.json files for dependency caching
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS package-extractor

WORKDIR /app

# Copy everything
COPY . .

# Extract only package.json files maintaining directory structure
# This creates a minimal /package-jsons directory with just the manifests
RUN mkdir -p /package-jsons && \
    find . -name "package.json" \
      -not -path "./node_modules/*" \
      -not -path "./.yarn/*" \
      -not -path "*/node_modules/*" \
      -exec sh -c 'mkdir -p "/package-jsons/$(dirname "$1")" && cp "$1" "/package-jsons/$1"' _ {} \;

# -----------------------------------------------------------------------------
# Stage 2: Install dependencies (cached layer)
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS deps

WORKDIR /app

# Copy yarn configuration first
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY .yarn/patches .yarn/patches

# Copy workspace configuration
COPY turbo.json tsconfig.json _tsconfig.base.json ./

# Copy only package.json files from all workspaces (from extractor stage)
COPY --from=package-extractor /package-jsons/packages ./packages
COPY --from=package-extractor /package-jsons/apps ./apps
COPY --from=package-extractor /package-jsons/integration-tests ./integration-tests

# Install dependencies - THIS LAYER IS CACHED if package.json files don't change
RUN corepack enable && yarn install --inline-builds

# -----------------------------------------------------------------------------
# Stage 3: Build and run
# -----------------------------------------------------------------------------
FROM deps AS final

WORKDIR /app

# Now copy the actual source code (this invalidates build cache, but deps are cached above)
COPY packages ./packages
COPY apps ./apps

# Set build environment
ENV NODE_ENV=production

# Supabase environment variables for Vite build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build all packages
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

WORKDIR /app/apps/goods-backend

ENV PORT=9000
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["npx", "switchyard", "start", "--host", "0.0.0.0"]
