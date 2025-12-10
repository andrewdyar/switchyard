# =============================================================================
# Production Dockerfile for Medusa Application
# =============================================================================
# This Dockerfile expects pre-built artifacts from GitHub Actions.
# The .medusa/server directory is created by `medusa build` in CI.
# =============================================================================

FROM node:20-bullseye-slim

# Create non-root user for security
RUN groupadd -r medusa && useradd -r -g medusa medusa

WORKDIR /app

# Copy the pre-built Medusa application
# This directory is created by `medusa build` in GitHub Actions
COPY apps/goods-backend/.medusa/server ./

# Install only production dependencies
RUN npm install --production --no-audit --no-fund && npm cache clean --force

# Set ownership to non-root user
RUN chown -R medusa:medusa /app

# Switch to non-root user
USER medusa

# Production environment
ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]
