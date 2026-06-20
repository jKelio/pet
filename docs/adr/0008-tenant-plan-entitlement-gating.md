# ADR 0008 — Tenant Plans, quota-based entitlements, billing deferred

**Status:** Accepted
**Supersedes:** the two-plan / two-boolean-gate sketch from the first design pass.

## Context

PET is to be monetised with **three Plans** — `free`, `pro`, `premium` — that gate features by both **boolean access** and **monthly/absolute quotas**. The product had **no** billing, subscription, plan, or entitlement concept before this (only an unused `tenant.plan` field defaulting to `'free'` in `onboard-tenant.ts`).

The plan matrix:

| Dimension (kind) | free | pro | premium |
|---|---|---|---|
| Members / seats (capacity) | 1 (= the club_admin) | 5 | ∞ |
| Teams (capacity) | 1 | 10 | ∞ |
| Cloud Sync (consumption, /month) | **0 — disabled** | 10 | ∞ |
| PDF Report (consumption, /month) | 2 | ∞ | ∞ |
| AI Recommendation (boolean) | ✗ | ✓ | ✓ |
| Tracking + on-screen results | ✓ | ✓ | ✓ |

Positioning: `free` = local-only trial, `pro` = small/ordinary clubs, `premium` = large clubs + national/regional federations.

The enforcement bar is **tamper-proof** (server is the wall, never the UI), and the billing customer is the **club**, so the entitlement is **Tenant-level**. Seat/team caps are *plan attributes*, not per-seat billing.

## Decision

**1. Plan on the Tenant.** `tenant.plan ∈ { free, pro, premium }`, default `free`, the single source of truth. Independent of any payment provider.

**2. Limits live in one fixed matrix.** A `PLAN_LIMITS` constant in `@pet/shared` maps each plan to its caps (`∞` = uncapped). Every enforcement point and the `/me` response read from it. **No per-tenant overrides** — `premium` is already ∞ on every metered dimension, so federations need no bespoke deals; overrides can be added later as `effectiveLimit = override ?? PLAN_LIMITS[plan]` without disturbing callers.

**3. Two kinds of limit.**
- **Capacity** (absolute current count): seats → gate `InviteMember`; teams → gate `CreateTeam`.
- **Consumption** (per **calendar month, UTC**, resets on the 1st): Cloud Sync → gate `SyncSession`; PDF Report → gate the render endpoint.

**4. Metering is tenant-wide and idempotent per session.** The monthly allowance is pooled across all members. A unit is **one distinct session per month** — re-syncing an edited session or re-downloading the same session's PDF in the same month is free. Consequences for the data model: **sync usage derives from `count(sessions in tenant created this month)`** (no new table), and PDF needs a small `pdf_exports(tenantId, sessionId, yyyymm)` ledger to dedupe and count (the PDF itself is never stored — see [[0009-server-side-pdf-report]]).

**5. Enforcement & responses.** Checks live in the use-case layer. A blocked action returns `403 UPGRADE_REQUIRED` (plan too low for the feature, e.g. free→AI) or `429 QUOTA_EXCEEDED` (allowance spent this month, e.g. pro's 11th sync). The resolved plan, limits, and current usage are surfaced via `/me` so the client shows counters and an upsell instead of failing blind. Free users still **see** gated buttons; the server is the wall.

**6. Billing deferred.** Plan is flipped via the existing **superadmin** surface for now. A payment processor later writes the same `tenant.plan` field behind the same interface — no gate, endpoint, or UI rework.

Downgrade/over-limit behaviour is its own decision — see [[0010-non-destructive-plan-downgrade]].

## Alternatives considered

**Integrate Stripe now:** rejected as premium — the gate (the durable asset) doesn't depend on a processor, and the paywall is still being shaped.

**Per-seat / per-team billing:** rejected — seat/team *caps* express the same intent as plan attributes without proration/assignment machinery or awkward cross-team-role edges.

**Per-tenant negotiated limits up front:** rejected (YAGNI) — `premium` = ∞ covers federations; add overrides only when a real contract needs them.

**Counting per action rather than per session:** rejected — "I downloaded my report twice and it cost me both PDFs" is a support ticket; per-distinct-session matches how the plans were described ("store 10 *trainings*", "2 *per month*").

## Consequences

- **Deliberate regressions:** current users lose free AI, lose unlimited free PDF (now 2/mo), and **lose free cloud sync entirely** on `free`. This is the point of the paywall, recorded so it is a decision, not an accident.
- `free` becomes a **fully-local trial** — its only server footprint is the account; sessions never sync (which is also why PDF must render statelessly, [[0009-server-side-pdf-report]]).
- Schema: `plan` already exists on tenants; add the `pdf_exports` ledger. New checks in `InviteMember`, `CreateTeam`, `SyncSession`, the PDF route, and the AI route; `/me` gains plan + limits + usage.
- The two-value sketch and its "full entitlement service is YAGNI" note are superseded: a quota matrix *is* the model now, but kept as a static config rather than a runtime service.
