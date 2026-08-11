# ==========================================
# STAGE 1: Dependency Assembly & Workspace Isolation
# ==========================================
FROM node:24-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root configurations to establish workspace scopes
COPY package.json package-lock.json tsconfig.json ./

# Copy internal package scopes
COPY packages/slicer-service/package.json ./packages/slicer-service/

# Install production dependencies
RUN npm ci --omit=dev

# ==========================================
# STAGE 2: Source Code Assembly & Staging Area
# ==========================================
FROM base AS builder
WORKDIR /app

# Copy source code into the build stage
COPY packages/slicer-service/ ./packages/slicer-service/

# ==========================================
# STAGE 3: Slim Production Runtime Environment
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

# Enforce non-root process execution
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sliceruser

# Not needed until I choose a headless slicer
# COPY package.json package-lock.json tsconfig.json ./

# Unpack production assets out of the intermediate builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/slicer-service ./packages/slicer-service

# Re-assign ownership profiles and drop privileges
RUN chown -R sliceruser:nodejs /app
USER sliceruser

EXPOSE 3000

# Stream raw TypeScript execution natively via Node 24 runtime
CMD ["node", "--experimental-strip-types", "packages/slicer-service/src/server.ts"]
