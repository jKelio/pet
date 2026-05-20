# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN bun install

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build frontend
WORKDIR /app/packages/web
RUN bun run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# SPA + API proxy config
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
