# =============================================================================
# Production Dockerfile for Medusa Application
# =============================================================================
# Builds from source on Fly.io's remote builder
# =============================================================================

FROM node:20-bullseye-slim

# Create app directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY .yarn/patches .yarn/patches

# Copy workspace configuration files
COPY turbo.json tsconfig.json _tsconfig.base.json ./

# Copy all packages and apps (needed for workspace dependencies)
COPY packages ./packages
COPY apps ./apps

# Install all dependencies and build
# Set NODE_ENV early to ensure production builds
ENV NODE_ENV=production

RUN corepack enable && \
    yarn install --inline-builds && \
    yarn build

# Build Medusa app (this creates .medusa/server with admin build)
RUN cd apps/goods-backend && \
    npx medusa build

# Verify build output exists and ensure admin is in the right place
RUN cd apps/goods-backend && \
    echo "=== Checking .medusa directory ===" && \
    ls -la .medusa/ 2>/dev/null || (echo "ERROR: .medusa directory not found" && exit 1) && \
    echo "=== Checking .medusa/client ===" && \
    ls -la .medusa/client/ 2>/dev/null || echo "Warning: .medusa/client not found" && \
    echo "=== Checking public/admin ===" && \
    ls -la public/admin/ 2>/dev/null || echo "Info: public/admin not found yet" && \
    echo "=== Finding index.html in .medusa ===" && \
    find .medusa -name "index.html" 2>/dev/null || echo "Warning: No index.html in .medusa" && \
    echo "=== Copying admin build if needed ===" && \
    if [ -d ".medusa/client" ] && [ ! -d "public/admin" ]; then \
      mkdir -p public/admin && \
      cp -r .medusa/client/* public/admin/ && \
      echo "Copied .medusa/client to public/admin"; \
    elif [ -d "public/admin" ]; then \
      echo "public/admin already exists, skipping copy"; \
    else \
      echo "ERROR: Neither .medusa/client nor public/admin found" && exit 1; \
    fi && \
    echo "=== Final verification ===" && \
    ls -la public/admin/ 2>/dev/null || (echo "ERROR: public/admin not found after copy" && exit 1) && \
    find public/admin -name "index.html" 2>/dev/null || (echo "ERROR: index.html not found in public/admin" && exit 1) && \
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
