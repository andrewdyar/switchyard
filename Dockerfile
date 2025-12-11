# =============================================================================
# Production Dockerfile for Medusa Application
# =============================================================================
# Builds from source on Fly.io's remote builder
# Optimized for Docker layer caching
# =============================================================================

FROM node:20-bullseye-slim

# Create app directory
WORKDIR /app

# =============================================================================
# Layer 1: Dependencies (CACHED unless package files change)
# =============================================================================
# Copy root package files needed for dependency installation
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY .yarn/patches .yarn/patches

# Copy workspace configuration files
COPY turbo.json tsconfig.json _tsconfig.base.json ./

# Copy workspace directories structure with package.json files
# Yarn needs to see all workspace package.json files to resolve dependencies
# We copy the full directories but this layer will be cached if package.json files don't change
COPY packages ./packages
COPY apps ./apps

# Install dependencies (this layer will be cached if package.json files don't change)
# Note: We copy packages/apps before install because Yarn workspaces need to see all package.json files
RUN corepack enable && \
    yarn install --inline-builds

# =============================================================================
# Layer 2: Build (uses cached node_modules from Layer 1)
# =============================================================================
# Note: packages and apps are already copied in Layer 1 (needed for yarn install)
# Source code changes will invalidate Layer 1, but dependency-only changes will cache
# Set NODE_ENV early to ensure production builds
ENV NODE_ENV=production

# Build all packages
RUN yarn build

# =============================================================================
# Layer 4: Medusa build (creates public/admin with transpiled files)
# =============================================================================
# Build Medusa app - this creates public/admin with Vite's transpiled output
RUN cd apps/goods-backend && \
    npx medusa build

# =============================================================================
# Layer 5: Verify admin build and fix HTML paths
# =============================================================================
# medusa build already outputs to public/admin with transpiled JavaScript
# Vite processes entry.jsx and outputs it as entry.js (transpiled)
# No copy needed - just verify and fix HTML paths
RUN cd apps/goods-backend && \
    echo "=== Verifying admin build ===" && \
    ls -la public/admin/ 2>/dev/null || (echo "ERROR: public/admin not found" && exit 1) && \
    find public/admin -name "index.html" 2>/dev/null || (echo "ERROR: index.html not found in public/admin" && exit 1) && \
    echo "=== Checking for entry files ===" && \
    ls -la public/admin/entry.* 2>/dev/null || echo "No entry files found" && \
    echo "=== Fixing HTML paths ===" && \
    if [ -f "public/admin/index.html" ]; then \
      if [ -f "public/admin/entry.js" ]; then \
        sed -i 's|src="./entry.jsx"|src="/app/entry.js"|g' public/admin/index.html && \
        sed -i 's|src="/app/entry.jsx"|src="/app/entry.js"|g' public/admin/index.html && \
        echo "Updated HTML to reference entry.js (Vite output)"; \
      elif [ -f "public/admin/entry.jsx" ]; then \
        sed -i 's|src="./entry.jsx"|src="/app/entry.jsx"|g' public/admin/index.html && \
        echo "Updated HTML to reference entry.jsx (kept original extension)"; \
      else \
        echo "WARNING: Neither entry.js nor entry.jsx found in public/admin"; \
      fi; \
    fi && \
    echo "=== Build verification complete ==="

# Change to the backend directory for runtime
WORKDIR /app/apps/goods-backend

# Production environment
ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start medusa - it will use the .medusa/server directory created by medusa build
# Bind to 0.0.0.0 so Fly.io proxy can reach it
# Note: When host is undefined, Node.js http.listen() binds to all interfaces (0.0.0.0) by default
# We explicitly set --host 0.0.0.0 to ensure it works correctly with Fly.io's proxy
CMD ["npx", "medusa", "start", "--host", "0.0.0.0"]
