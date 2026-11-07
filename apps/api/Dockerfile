# Production Dockerfile for Givvly NestJS API
FROM node:22-alpine AS builder

WORKDIR /app

# Install system dependencies required for native modules (Argon2, OpenSSL for Prisma)
RUN apk add --no-cache libc6-compat python3 make g++ openssl

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared packages and api source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies across workspace
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @givvly/api prisma:generate

# Build API application
RUN pnpm --filter @givvly/api build

# Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl curl

ENV NODE_ENV=production
ENV PORT=4000

# Copy built application and production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]

