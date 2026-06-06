# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

RUN bun install

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Build server and migration runner bundles
RUN bun build packages/server/src/presentation/index.ts \
      --outdir packages/server/dist \
      --target bun \
      --minify

RUN bun build packages/server/src/infrastructure/db/migrate.ts \
      --outdir packages/server/dist \
      --target bun \
      --minify

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner

WORKDIR /app

COPY --from=builder /app/packages/server/dist/index.js ./index.js
COPY --from=builder /app/packages/server/dist/migrate.js ./migrate.js

# Copy generated SQL migrations (needed at runtime by migrate.js)
COPY --from=builder /app/packages/server/src/infrastructure/db/migrations ./migrations

COPY packages/server/docker-entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
