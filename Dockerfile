# Stage 1: Build everything
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy entire workspace for build
COPY . .

# Install all dependencies and build
RUN yarn install && \
    yarn build && \
    npx medusa build

# Stage 2: Production runtime with only necessary files
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy configuration files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY medusa-config.ts tsconfig.json ./

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/.medusa ./.medusa
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Set production environment
ENV NODE_ENV=production

# Expose Medusa port
EXPOSE 9000

# Set memory limit for Node.js
ENV NODE_OPTIONS="--max-old-space-size=768"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "medusa", "start"]
