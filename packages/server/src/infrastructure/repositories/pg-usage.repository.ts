import { and, count, eq, gte, lt, sql } from 'drizzle-orm';
import { periodRange, type TenantUsage } from '@pet/shared';
import type { DbClient } from '../db/client.js';
import { memberships, teams, practiceSessions, pdfExports } from '../db/schema.js';
import type { UsageRepository } from '../../domain/ports/usage.repository.js';

export class PgUsageRepository implements UsageRepository {
  constructor(private readonly db: DbClient) {}

  async getUsage(tenantId: string, period: string): Promise<TenantUsage> {
    const { start, end } = periodRange(period);

    const [seatRows, teamRows, syncRows, pdfRows] = await Promise.all([
      this.db.select({ value: count() }).from(memberships).where(eq(memberships.tenantId, tenantId)),
      // External Teams do not count against the own-team capacity limit.
      this.db.select({ value: count() }).from(teams).where(and(eq(teams.tenantId, tenantId), sql`${teams.kind} = 'own'`)),
      // Sync usage = distinct sessions first synced this period. createdAt is set on
      // first sync and preserved on later re-syncs, so it is the per-session anchor.
      this.db.select({ value: count() }).from(practiceSessions).where(and(
        eq(practiceSessions.tenantId, tenantId),
        gte(practiceSessions.createdAt, start),
        lt(practiceSessions.createdAt, end),
      )),
      // The ledger holds one row per (tenant, session, period), so a plain count
      // is already the distinct-session count.
      this.db.select({ value: count() }).from(pdfExports).where(and(
        eq(pdfExports.tenantId, tenantId),
        eq(pdfExports.period, period),
      )),
    ]);

    return {
      seats: seatRows[0]?.value ?? 0,
      teams: teamRows[0]?.value ?? 0,
      syncThisPeriod: syncRows[0]?.value ?? 0,
      pdfThisPeriod: pdfRows[0]?.value ?? 0,
    };
  }
}
