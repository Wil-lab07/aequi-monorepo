# syntax = docker/dockerfile:1

# Base stage with bun
FROM oven/bun:1.2.20-alpine AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
# Copy root package files for workspace resolution
COPY package.json turbo.json ./
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN bun install

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY turbo.json ./
COPY package.json ./
COPY apps/server ./apps/server

# Build the server (if needed, though bun can run TypeScript directly)
# RUN bun run build --filter=server

# Production stage
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/apps/server ./apps/server
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json

USER fastify

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["bun", "run", "apps/server/index.ts"]
