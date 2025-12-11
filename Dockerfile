# =============================================================================
# Production Dockerfile for Medusa Application
# =============================================================================
# Expects pre-built artifacts from GitHub Actions in .fly-deploy/
# =============================================================================

FROM node:20-bullseye-slim

# Create app directory
WORKDIR /app

# Copy pre-built application
COPY .fly-deploy/ ./

# Install production dependencies
RUN npm install --production --no-audit --no-fund && npm cache clean --force

# Production environment
ENV NODE_ENV=production
ENV PORT=9000
ENV HOST=0.0.0.0

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start medusa - bind to 0.0.0.0 so Fly.io proxy can reach it
CMD ["npx", "medusa", "start", "--host", "0.0.0.0"]
