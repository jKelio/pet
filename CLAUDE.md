# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

PET (Practice Efficiency Tracking) v2 — a web application for tracking ice hockey practice efficiency. Coaches log timing and count data across drills during training sessions and generate visualizations. Multi-tenant SaaS with magic-link authentication.

**Tech Stack:**
- **Runtime:** Bun
- **Backend:** Fastify + PostgreSQL (Drizzle ORM) — Clean Architecture
- **Frontend:** React + Vite + TailwindCSS + shadcn/ui + Zustand + Dexie.js (offline)
- **Auth:** Magic link via email (JWT access + refresh tokens, multi-tenant)
- **Email:** Nodemailer/SMTP (Mailpit for local dev)
- **Monorepo:** Turborepo + Bun workspaces
- **Tests:** `bun test` (no Vitest/Jest)
- **Deploy:** Docker Compose + Helm

## Commands

```bash
# From repo root
bun install              # Install all workspace dependencies
bun run dev              # Start all packages in dev mode (turbo)
bun run build            # Build all packages
bun run test             # Run all tests with bun test
bun run typecheck        # TypeScript check all packages
bun run lint             # Lint all packages

# Docker (local full-stack)
docker compose up        # Starts postgres, mailpit, server, web
# Mailpit UI at http://localhost:8025
```

## Directory Structure

```
pet/
├── packages/
│   ├── server/            # Fastify API server (Clean Architecture)
│   │   └── src/
│   │       ├── domain/    # Entities, ports (interfaces)
│   │       ├── application/use-cases/
│   │       ├── infrastructure/  # DB, email, token implementations
│   │       └── presentation/   # Routes, plugins, middleware
│   ├── web/               # React SPA
│   │   └── src/
│   │       ├── features/  # Feature-sliced: auth, tracking, sessions, admin
│   │       ├── shared/    # Shared UI components, API client, stores
│   │       └── router.tsx
│   └── shared/            # Shared TypeScript types (DTOs)
├── helm/                  # Kubernetes Helm chart
├── docker-compose.yml
├── .env.example
├── package.json           # Turbo root
└── turbo.json
```

## Architecture — Server

Clean Architecture with four layers:

1. **Domain** (`src/domain/`) — entities + port interfaces (no dependencies)
2. **Application** (`src/application/use-cases/`) — use cases, orchestrate domain
3. **Infrastructure** (`src/infrastructure/`) — Drizzle/PostgreSQL, Nodemailer, Jose JWT
4. **Presentation** (`src/presentation/`) — Fastify routes, DI plugin, middleware

Key use cases: `SendMagicLink`, `VerifyMagicLink`, `RefreshSession`, `SyncSession`, `GetMyProfile`, `OnboardTenant`, `CreateTeam`, `ListMembers`, `InviteMember`, `RemoveMember`

## Architecture — Web

Feature-sliced design under `src/features/`:

- **auth** — magic link flow, auth store (Zustand)
- **tracking** — drill setup, live timer/counter, offline session save (Dexie)
- **sessions** — local session history, cloud session browser
- **admin** — tenant onboarding, team management, member invite/remove

Shared API client (`src/shared/lib/api-client.ts`) auto-refreshes JWT on 401.

## Environment Variables

Copy `.env.example` to `.env`. Required:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Long random string for JWT signing |
| `APP_BASE_URL` | Public URL (e.g. `http://localhost`) |
| `SMTP_FROM` | From address for emails |

SMTP defaults to Mailpit (`localhost:1025`) for local dev — no changes needed.

## Testing

Uses `bun test` exclusively. Test files are `*.test.ts` co-located with source.

```bash
bun run test                         # all packages
cd packages/server && bun test       # server only
cd packages/web && bun test          # web only
```

## Database

Drizzle ORM with PostgreSQL. Migration files in `packages/server/src/infrastructure/db/migrations/`.

```bash
cd packages/server
bun run db:migrate   # apply migrations
bun run db:generate  # generate migration from schema changes
```

## Adding Translations

All i18n strings in `packages/web/src/lib/i18n.ts`. Add under all three languages (en/de/ru). Use `useTranslation()` hook in components.
