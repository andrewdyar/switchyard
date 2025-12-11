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

# Copy workspace configuration
COPY turbo.json tsconfig.json ./

# Copy all packages and apps (needed for workspace dependencies)
COPY packages ./packages
COPY apps ./apps

# Install all dependencies and build
RUN corepack enable && \
    yarn install --inline-builds && \
    yarn build && \
    cd apps/goods-backend && \
    npx medusa build

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
