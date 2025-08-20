# Production Dockerfile for Cosnap AI Backend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Asia/Shanghai

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS dev
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
USER nextjs
CMD ["npm", "start"]

# Production build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Remove dev dependencies
RUN npm prune --production

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=nextjs:nodejs . .

# Generate Prisma client in production
RUN npx prisma generate

# Create necessary directories
RUN mkdir -p /var/log/cosnap && \
    chown -R nextjs:nodejs /var/log/cosnap && \
    mkdir -p uploads && \
    chown -R nextjs:nodejs uploads

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3001, path: '/health', timeout: 3000 }; \
    const req = http.request(options, (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Expose port
EXPOSE 3001

# Set non-root user
USER nextjs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]