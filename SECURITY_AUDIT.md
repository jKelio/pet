# Security Audit — PET v2

**Date:** 2026-06-10
**Scope:** Full codebase — server (Fastify/Drizzle), web (React/Vite), shared packages, Docker Compose, Helm chart.
**Method:** Manual code review of authentication, authorization/multi-tenancy, input handling, infrastructure configuration, frontend token handling, and dependencies.

## Executive summary

No critical, directly exploitable vulnerability was found. The foundations are solid: tenant
isolation is enforced consistently at the repository layer, all non-auth routes require
authentication, request bodies are validated with Zod, Drizzle's query builder rules out SQL
injection, magic-link tokens are stored hashed, and the refresh token lives in an `httpOnly`
cookie. The findings below are hardening gaps; the highest-impact ones were fixed in this
branch (status **Fixed**), larger architectural items are documented as recommendations.

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Refresh tokens not stored server-side — no revocation, rotation, or reuse detection | High | Recommendation |
| 2 | Access token persisted in `localStorage` (XSS theft risk) | High | Recommendation |
| 3 | No security headers (API and web tier) | High | **Fixed** |
| 4 | No dedicated rate limit on `POST /auth/verify` | High | **Fixed** |
| 5 | Magic-link single use not atomic (TOCTOU race) | Medium | **Fixed** |
| 6 | Access token TTL of 7 days | Medium | **Fixed** (now 1 h) |
| 7 | JWT verification without explicit algorithm allow-list | Medium | **Fixed** |
| 8 | No `JWT_SECRET` strength validation at startup | Medium | **Fixed** |
| 9 | Postgres (5432) and Mailpit UI (8025) bound to all interfaces in docker-compose | Medium | **Fixed** (loopback) |
| 10 | No explicit Fastify `bodyLimit` | Low | **Fixed** |
| 11 | Containers run as root; no Helm `securityContext` | Medium | Recommendation |
| 12 | Old access tokens stay valid after tenant switch | Low | Recommendation |
| 13 | No audit logging of auth events | Info | Recommendation |

## Fixed in this branch

### 3. Security headers
- **Server:** `@fastify/helmet@13` registered in `packages/server/src/presentation/index.ts`
  (CSP disabled — pure JSON API; CSP is owned by the web tier).
- **Web:** `packages/web/nginx.conf` now sends `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and a CSP
  (`script-src 'self'`, `style-src 'self' 'unsafe-inline'` for React inline styles,
  `frame-ancestors 'none'`). Headers are duplicated in the static-asset `location` block
  because nginx does not inherit `add_header` into blocks that declare their own.
  HSTS is included commented out — enable once the site is HTTPS-only.

### 4. Rate limit on `/auth/verify`
`packages/server/src/presentation/routes/auth.routes.ts` — 10 requests / 15 minutes per IP
(magic-link sending was already limited to 5 / 15 min). Tokens are 256-bit random values, so
brute force was already impractical; the limit removes the residual risk under the previous
global 60/min budget.

### 5. Atomic single-use magic link
Previously `VerifyMagicLinkUseCase` looked the token up and cleared it in two separate
queries — two concurrent requests could both pass the lookup. The repository port now exposes
`consumeMagicLinkToken(tokenHash)` which clears the hash and returns the user in a single
`UPDATE … RETURNING` (`packages/server/src/infrastructure/repositories/pg-user.repository.ts`);
Postgres row locking guarantees the second request matches zero rows. Covered by a new test in
`verify-magic-link.test.ts`.

### 6. Access token TTL reduced to 1 hour
`packages/shared/src/constants.ts` — was 7 days. The web client already silently refreshes on
401 via the deduplicated `refreshAccessToken()` flow in `packages/web/src/shared/lib/api-client.ts`,
so the change is transparent to users. Known edge: the `sse()` helper does not refresh-and-retry
on 401; a stale tab may fail to open one event stream until any regular API call refreshes the
token (see recommendations).

### 7. Explicit JWT algorithm allow-list
`packages/server/src/infrastructure/services/jose-token.service.ts` — `jwtVerify(…, { algorithms: ['HS256'] })`.
jose with a symmetric key already rejects non-HMAC algorithms; this makes the constraint explicit.

### 8. `JWT_SECRET` validation
`packages/server/src/presentation/index.ts` — startup now fails if the secret is shorter than
32 characters or still equals the `.env.example` placeholder. Generate one with
`openssl rand -base64 64`.

### 9/10. Infrastructure
- `docker-compose.yml`: Postgres and Mailpit ports are now bound to `127.0.0.1`. The Mailpit UI
  shows every captured magic-link email and must never be reachable from other hosts. The
  `pet_dev_secret` password fallback remains for zero-config local dev — **set
  `POSTGRES_PASSWORD` explicitly for any non-local deployment**.
- Fastify now sets an explicit `bodyLimit` (1 MiB).

## Recommendations (not fixed here)

### 1. Server-side refresh token storage with rotation (High)
Refresh tokens are stateless JWTs valid for 30 days; a leaked token cannot be revoked and reuse
cannot be detected. Recommended: a `refresh_tokens` table (hashed token, `user_id`,
`revoked_at`, `replaced_by`), rotate on every `/auth/refresh`, and treat reuse of a rotated
token as a breach signal (revoke the whole chain). This also enables "log out everywhere".

### 2. Move the access token out of `localStorage` (High)
`packages/web/src/features/auth/stores/auth.store.ts` persists `accessToken` via Zustand
`persist`. Any XSS gives an attacker a valid token. Recommended: keep the token in memory only
and restore sessions on page load through the existing `httpOnly` refresh cookie (silent
refresh). The 1-hour TTL shipped in this branch already shrinks the exposure window
considerably.

### 11. Container hardening (Medium)
Add a non-root `USER` to both Dockerfiles and a `securityContext`
(`runAsNonRoot`, `allowPrivilegeEscalation: false`, `capabilities: drop: [ALL]`,
`readOnlyRootFilesystem` where possible) to the Helm deployments.

### 12. Tenant switch does not invalidate prior tokens (Low)
After `POST /auth/switch-tenant` the old access token (other tenant's claim) stays valid until
expiry. With the 1-hour TTL this is a small window; a server-side denylist would close it
entirely. At minimum, log tenant switches.

### 13. Audit logging (Info)
Add structured logs (user id, IP, outcome) for magic-link requests, verifications, refreshes,
tenant switches, and member management to support incident response.

### Minor notes
- `sse()` in the web API client should refresh-and-retry once on 401, matching `request()`.
- `EmailDeliveryError` embeds the recipient address in its message — fine for internal logs,
  must never reach API responses (currently it does not).
- Refresh cookie uses `SameSite=Lax` scoped to `/auth/refresh`; `Strict` would be marginally
  safer if cross-site navigation flows are not needed.
- Consider failing startup when `CORS_ORIGIN` is unset outside development instead of
  defaulting to `http://localhost:5173`.
- The seed script logs only fixed demo addresses (`admin@demo.local`) — not real PII.

## Verified as sound (no action needed)

- **Tenant isolation:** every repository query scopes by `tenantId` taken from the JWT claim,
  never from request input; no IDOR paths found across sessions, teams, members, sources, and
  recommendations.
- **Authorization:** all non-auth route groups attach the auth middleware via `onRequest`
  hooks; superadmin routes additionally require `requireSuperAdmin`; role checks
  (`club_admin`/`coach`/`analyst`) match the permission matrix in `packages/shared/src/permissions.ts`.
- **Input validation:** Zod schemas on all bodies; `InviteUserSchema` constrains `role` to the
  enum, and only `club_admin` may invite, so role assignment is delegation, not escalation.
- **Injection:** Drizzle query builder throughout; no raw SQL string construction.
- **Magic-link flow:** 256-bit random tokens, SHA-256 hashed at rest, 15-minute TTL,
  enumeration-safe responses, send rate limit.
- **Dependencies:** current major versions (Fastify 5, jose 6, React 19, Vite 6, Drizzle 0.38);
  no known-vulnerable pins spotted.
- **Frontend:** no `dangerouslySetInnerHTML`; service worker excludes `/api` from caching.
