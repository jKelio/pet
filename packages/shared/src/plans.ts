import type { TenantPlan } from './types.js';

// ─── Plan Limits ──────────────────────────────────────────────────────────────
// The single source of truth for what each Plan allows. Every enforcement point
// (seats, teams, cloud sync, PDF report) and the /me response read from here.
// See docs/adr/0008-tenant-plan-entitlement-gating.md and CONTEXT.md.

/**
 * An uncapped limit. Represented as `null` (not `Infinity`) so it survives
 * `JSON.stringify` intact when surfaced to the client via /me — `Infinity`
 * serialises to `null` anyway, so we make that explicit and lossless.
 */
export type Limit = number | null;

export interface PlanLimits {
  /** Max Memberships (seats) in the tenant, including the club_admin. Capacity limit. */
  seats: Limit;
  /** Max own Teams in the tenant. Capacity limit. External Teams are not counted here. */
  teams: Limit;
  /** Cloud Syncs (distinct sessions) allowed per calendar month. `0` disables sync entirely. Consumption limit. */
  syncPerMonth: Limit;
  /** PDF Reports (distinct sessions) allowed per calendar month. Consumption limit. */
  pdfPerMonth: Limit;
  /** Whether AI Recommendation generation is available at all. Boolean gate. */
  ai: boolean;
  /** Whether External Teams (kind='external') may be created and synced. Boolean gate. Premium-only. */
  externalTeams: boolean;
}

/** `null` means uncapped (∞). */
export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  free: { seats: 1, teams: 1, syncPerMonth: 0, pdfPerMonth: 2, ai: false, externalTeams: false },
  pro: { seats: 5, teams: 10, syncPerMonth: 10, pdfPerMonth: null, ai: true, externalTeams: false },
  premium: { seats: null, teams: null, syncPerMonth: null, pdfPerMonth: null, ai: true, externalTeams: true },
};

/** Limits for a given plan. */
export function planLimits(plan: TenantPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** True when the limit is uncapped (∞). */
export function isUnlimited(limit: Limit): boolean {
  return limit === null;
}

/**
 * Whether one more unit may be consumed/created given the current usage.
 * `used` is the current count (capacity) or units spent this month (consumption).
 * Uncapped limits always allow; a limit of `0` always denies.
 */
export function withinLimit(used: number, limit: Limit): boolean {
  if (limit === null) return true;
  return used < limit;
}

/** Units left before the limit is hit; `null` when uncapped. Never negative. */
export function remaining(used: number, limit: Limit): Limit {
  if (limit === null) return null;
  return Math.max(0, limit - used);
}

// ─── Usage & Entitlement Snapshot ─────────────────────────────────────────────
// A tenant's current usage and the resolved per-feature entitlement, surfaced to
// the client via /me. Both server (enforcement) and client (counters/upsell)
// resolve from the same `resolveEntitlements` to stay in lockstep.

/** Current usage for a tenant. Consumption counts are scoped to the active calendar month. */
export interface TenantUsage {
  /** Current Membership (seat) count. */
  seats: number;
  /** Current Team count. */
  teams: number;
  /** Distinct sessions synced this period. */
  syncThisPeriod: number;
  /** Distinct sessions exported as a PDF Report this period. */
  pdfThisPeriod: number;
}

export interface FeatureEntitlement {
  /** The cap; `null` = uncapped, `0` = disabled on this plan. */
  limit: Limit;
  /** Units already used. */
  used: number;
  /** Units left; `null` = uncapped. */
  remaining: Limit;
  /** Whether one more unit may be used/created right now. */
  allowed: boolean;
}

export interface EntitlementSnapshot {
  plan: TenantPlan;
  seats: FeatureEntitlement;
  teams: FeatureEntitlement;
  sync: FeatureEntitlement;
  pdf: FeatureEntitlement;
  /** AI is a boolean feature, not a quota. */
  ai: { allowed: boolean };
  /** External Teams (kind='external') are a boolean feature — Premium-only. */
  externalTeams: { allowed: boolean };
}

function feature(limit: Limit, used: number): FeatureEntitlement {
  return { limit, used, remaining: remaining(used, limit), allowed: withinLimit(used, limit) };
}

/** Pure: resolve a tenant's plan + usage into a per-feature entitlement snapshot. */
export function resolveEntitlements(plan: TenantPlan, usage: TenantUsage): EntitlementSnapshot {
  const limits = PLAN_LIMITS[plan];
  return {
    plan,
    seats: feature(limits.seats, usage.seats),
    teams: feature(limits.teams, usage.teams),
    sync: feature(limits.syncPerMonth, usage.syncThisPeriod),
    pdf: feature(limits.pdfPerMonth, usage.pdfThisPeriod),
    ai: { allowed: limits.ai },
    externalTeams: { allowed: limits.externalTeams },
  };
}

// ─── Billing period ───────────────────────────────────────────────────────────
// Consumption quotas reset on the calendar month, UTC. The period key is `YYYY-MM`.

/** The `YYYY-MM` (UTC) period key for a moment in time. */
export function currentPeriod(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** The half-open `[start, end)` UTC instant range covered by a `YYYY-MM` period key. */
export function periodRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}
