FROM node:18-bullseye

# Install build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable corepack for yarn
RUN corepack enable

# Copy package files first for caching
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy all source
COPY . .

# Increase memory and install
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN yarn install --inline-builds

# Build all packages
RUN yarn build

# Build goods-backend app
WORKDIR /app/apps/goods-backend
RUN npx medusa build

# Runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"
EXPOSE 9000

CMD ["npx", "medusa", "start"]

