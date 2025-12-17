# =============================================================================
# Production Dockerfile for Switchyard Application
# =============================================================================
# Simple single-stage build - reliable and straightforward
# =============================================================================

FROM node:20-bullseye-slim

WORKDIR /app

# Copy package manifests and yarn configuration
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY .yarn/patches .yarn/patches

# Copy workspace configuration
COPY turbo.json tsconfig.json _tsconfig.base.json ./

# Copy all workspace packages and apps
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN corepack enable && yarn install --inline-builds

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
