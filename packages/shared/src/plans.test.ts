import { describe, it, expect } from 'bun:test';
import {
  PLAN_LIMITS,
  planLimits,
  isUnlimited,
  withinLimit,
  remaining,
  resolveEntitlements,
  currentPeriod,
  periodRange,
  type TenantUsage,
} from './plans.js';

const noUsage: TenantUsage = { seats: 0, teams: 0, syncThisPeriod: 0, pdfThisPeriod: 0 };

describe('PLAN_LIMITS', () => {
  it('encodes the three-plan matrix from the ADRs', () => {
    expect(PLAN_LIMITS.free).toEqual({ seats: 1, teams: 1, syncPerMonth: 0, pdfPerMonth: 2, ai: false, externalTeams: false });
    expect(PLAN_LIMITS.pro).toEqual({ seats: 5, teams: 10, syncPerMonth: 10, pdfPerMonth: null, ai: true, externalTeams: false });
    expect(PLAN_LIMITS.premium).toEqual({ seats: null, teams: null, syncPerMonth: null, pdfPerMonth: null, ai: true, externalTeams: true });
  });

  it('uses null (not Infinity) for uncapped limits so it survives JSON', () => {
    const roundTripped = JSON.parse(JSON.stringify(PLAN_LIMITS.premium));
    expect(roundTripped).toEqual(PLAN_LIMITS.premium);
  });

  it('only pro and premium may use AI', () => {
    expect(PLAN_LIMITS.free.ai).toBe(false);
    expect(PLAN_LIMITS.pro.ai).toBe(true);
    expect(PLAN_LIMITS.premium.ai).toBe(true);
  });

  it('only premium may use External Teams', () => {
    expect(PLAN_LIMITS.free.externalTeams).toBe(false);
    expect(PLAN_LIMITS.pro.externalTeams).toBe(false);
    expect(PLAN_LIMITS.premium.externalTeams).toBe(true);
  });

  it('free cannot cloud sync at all', () => {
    expect(PLAN_LIMITS.free.syncPerMonth).toBe(0);
    expect(withinLimit(0, PLAN_LIMITS.free.syncPerMonth)).toBe(false);
  });
});

describe('planLimits', () => {
  it('returns the limits for a plan', () => {
    expect(planLimits('pro')).toBe(PLAN_LIMITS.pro);
  });
});

describe('isUnlimited', () => {
  it('is true only for null', () => {
    expect(isUnlimited(null)).toBe(true);
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(10)).toBe(false);
  });
});

describe('withinLimit', () => {
  it('allows consuming below a finite limit', () => {
    expect(withinLimit(0, 2)).toBe(true);
    expect(withinLimit(1, 2)).toBe(true);
  });

  it('denies once the limit is reached', () => {
    expect(withinLimit(2, 2)).toBe(false);
    expect(withinLimit(3, 2)).toBe(false);
  });

  it('always denies a zero limit (sync disabled on free)', () => {
    expect(withinLimit(0, 0)).toBe(false);
  });

  it('always allows when uncapped', () => {
    expect(withinLimit(0, null)).toBe(true);
    expect(withinLimit(9_999, null)).toBe(true);
  });
});

describe('remaining', () => {
  it('counts down a finite allowance and never goes negative', () => {
    expect(remaining(0, 2)).toBe(2);
    expect(remaining(1, 2)).toBe(1);
    expect(remaining(2, 2)).toBe(0);
    expect(remaining(5, 2)).toBe(0);
  });

  it('is null when uncapped', () => {
    expect(remaining(100, null)).toBe(null);
  });
});

describe('resolveEntitlements', () => {
  it('a fresh free club may not sync or use AI, but may export a PDF', () => {
    const e = resolveEntitlements('free', noUsage);
    expect(e.plan).toBe('free');
    expect(e.sync).toEqual({ limit: 0, used: 0, remaining: 0, allowed: false });
    expect(e.ai.allowed).toBe(false);
    expect(e.pdf).toEqual({ limit: 2, used: 0, remaining: 2, allowed: true });
    expect(e.seats).toEqual({ limit: 1, used: 0, remaining: 1, allowed: true });
  });

  it('free PDF allowance runs out after 2 exports', () => {
    const e = resolveEntitlements('free', { ...noUsage, pdfThisPeriod: 2 });
    expect(e.pdf.allowed).toBe(false);
    expect(e.pdf.remaining).toBe(0);
  });

  it('pro pools 10 syncs and is unlimited on PDF', () => {
    const e = resolveEntitlements('pro', { seats: 5, teams: 10, syncThisPeriod: 9, pdfThisPeriod: 999 });
    expect(e.sync).toEqual({ limit: 10, used: 9, remaining: 1, allowed: true });
    expect(e.seats.allowed).toBe(false); // 5 of 5 seats taken
    expect(e.teams.allowed).toBe(false); // 10 of 10 teams
    expect(e.pdf).toEqual({ limit: null, used: 999, remaining: null, allowed: true });
    expect(e.ai.allowed).toBe(true);
  });

  it('pro that has spent its 10 syncs is blocked', () => {
    const e = resolveEntitlements('pro', { ...noUsage, syncThisPeriod: 10 });
    expect(e.sync.allowed).toBe(false);
  });

  it('premium is unlimited everywhere', () => {
    const e = resolveEntitlements('premium', { seats: 9999, teams: 9999, syncThisPeriod: 9999, pdfThisPeriod: 9999 });
    expect(e.seats.allowed).toBe(true);
    expect(e.teams.allowed).toBe(true);
    expect(e.sync.allowed).toBe(true);
    expect(e.pdf.allowed).toBe(true);
    expect(e.ai.allowed).toBe(true);
    expect(e.externalTeams.allowed).toBe(true);
  });

  it('free and pro may not use External Teams', () => {
    expect(resolveEntitlements('free', noUsage).externalTeams.allowed).toBe(false);
    expect(resolveEntitlements('pro', noUsage).externalTeams.allowed).toBe(false);
  });
});

describe('currentPeriod', () => {
  it('formats a UTC YYYY-MM key', () => {
    expect(currentPeriod(new Date('2026-06-20T09:00:00Z'))).toBe('2026-06');
    expect(currentPeriod(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
    expect(currentPeriod(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });

  it('uses UTC, not local time, at the day boundary', () => {
    // 2026-07-01T00:30 UTC is still July regardless of the runner's timezone
    expect(currentPeriod(new Date('2026-07-01T00:30:00Z'))).toBe('2026-07');
  });
});

describe('periodRange', () => {
  it('returns the half-open month range in UTC', () => {
    const { start, end } = periodRange('2026-06');
    expect(start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('rolls over the year for December', () => {
    const { start, end } = periodRange('2026-12');
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
