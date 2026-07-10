import { eq, and, desc, inArray, sql, type SQL } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { practiceSessions, drills, teams, tenants } from '../db/schema.js';
import type { SessionRepository, FindSessionsOptions, SessionPageResult } from '../../domain/ports/session.repository.js';
import type { PracticeSession, Drill, PracticeInfo } from '@pet/shared';

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string, tenantId: string): Promise<PracticeSession | null> {
    const [row] = await this.db
      .select({ session: practiceSessions, teamName: teams.name, clubName: tenants.name })
      .from(practiceSessions)
      .innerJoin(teams, eq(teams.id, practiceSessions.teamId))
      .innerJoin(tenants, eq(tenants.id, practiceSessions.tenantId))
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    const drillRows = await this.db
      .select()
      .from(drills)
      .where(eq(drills.sessionId, id))
      .orderBy(drills.sequenceNumber);

    return this.toEntity(row.session, drillRows, row.teamName, row.clubName);
  }

  async findByTeam(teamId: string, tenantId: string, options: FindSessionsOptions = {}): Promise<SessionPageResult> {
    const { limit, before } = options;
    // Sessions without a practice date sort as -infinity, i.e. after everything else.
    const dateKey = sql`coalesce(${practiceSessions.date}, '-infinity'::date)`;

    const conditions: SQL[] = [
      eq(practiceSessions.teamId, teamId),
      eq(practiceSessions.tenantId, tenantId),
    ];
    if (before) {
      conditions.push(
        sql`(${dateKey}, ${practiceSessions.createdAt}, ${practiceSessions.id}) < (coalesce(${before.date}::date, '-infinity'::date), ${before.createdAt}::timestamptz, ${before.id}::uuid)`,
      );
    }

    const query = this.db
      .select({ session: practiceSessions, teamName: teams.name, clubName: tenants.name })
      .from(practiceSessions)
      .innerJoin(teams, eq(teams.id, practiceSessions.teamId))
      .innerJoin(tenants, eq(tenants.id, practiceSessions.tenantId))
      .where(and(...conditions))
      .orderBy(desc(dateKey), desc(practiceSessions.createdAt), desc(practiceSessions.id));

    // Fetch one extra row to know whether an older page exists.
    const rows = limit != null ? await query.limit(limit + 1) : await query;
    const pageRows = limit != null ? rows.slice(0, limit) : rows;
    const hasMore = limit != null && rows.length > limit;

    const sessionIds = pageRows.map((row) => row.session.id);
    const drillRows = sessionIds.length > 0
      ? await this.db
          .select()
          .from(drills)
          .where(inArray(drills.sessionId, sessionIds))
          .orderBy(drills.sequenceNumber)
      : [];
    const drillsBySession = new Map<string, typeof drillRows>();
    for (const drill of drillRows) {
      const list = drillsBySession.get(drill.sessionId);
      if (list) list.push(drill);
      else drillsBySession.set(drill.sessionId, [drill]);
    }

    const items = pageRows.map((row) =>
      this.toEntity(row.session, drillsBySession.get(row.session.id) ?? [], row.teamName, row.clubName),
    );

    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last
      ? { date: last.session.date, createdAt: last.session.createdAt.toISOString(), id: last.session.id }
      : null;

    return { items, nextCursor };
  }

  async save(session: PracticeSession): Promise<void> {
    const { practiceInfo: info, drills: sessionDrills } = session;

    await this.db.transaction(async (tx) => {
      await tx
        .insert(practiceSessions)
        .values({
          id: session.id,
          tenantId: session.tenantId,
          teamId: session.teamId,
          createdBy: session.createdBy,
          date: info.date.split('T')[0],
          coachName: info.coachName,
          athletesCount: info.athletesNumber,
          coachesCount: info.coachesNumber,
          totalTimeMinutes: info.totalTime,
          trackedPlayerName: info.trackedPlayerName,
          gapTimeData: info.wasteTime as any,
          status: session.status,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        })
        .onConflictDoUpdate({
          target: practiceSessions.id,
          set: {
            coachName: info.coachName,
            athletesCount: info.athletesNumber,
            coachesCount: info.coachesNumber,
            trackedPlayerName: info.trackedPlayerName,
            gapTimeData: info.wasteTime as any,
            status: session.status,
            updatedAt: new Date(session.updatedAt),
          },
        });

      // Delete existing drills and re-insert (simplest upsert for ordered list)
      await tx.delete(drills).where(eq(drills.sessionId, session.id));

      if (sessionDrills.length > 0) {
        await tx.insert(drills).values(
          sessionDrills.map((drill: Drill, idx: number) => ({
            sessionId: session.id,
            sequenceNumber: idx + 1,
            tags: drill.tags,
            timerData: drill.timerData as any,
            counterData: drill.counterData as any,
            wasteTimeData: drill.wasteTime as any,
            actionButtons: drill.actionButtons as any,
          })),
        );
      }
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(practiceSessions)
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.tenantId, tenantId)));
  }

  private toEntity(row: typeof practiceSessions.$inferSelect, drillRows: (typeof drills.$inferSelect)[], teamName: string, clubName: string): PracticeSession {
    const practiceInfo: PracticeInfo = {
      clubName,
      teamName,
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      coachName: row.coachName,
      athletesNumber: row.athletesCount,
      coachesNumber: row.coachesCount,
      totalTime: row.totalTimeMinutes,
      trackedPlayerName: row.trackedPlayerName,
      drillsNumber: drillRows.length,
      wasteTime: row.gapTimeData as any,
    };

    const mappedDrills: Drill[] = drillRows.map((d, idx) => ({
      id: idx + 1,
      tags: (d.tags ?? []) as any,
      actionButtons: (d.actionButtons ?? []) as any,
      timerData: (d.timerData ?? {}) as any,
      counterData: (d.counterData ?? {}) as any,
      wasteTime: (d.wasteTimeData ?? { totalTime: 0, timeSegments: [] }) as any,
    }));

    return {
      id: row.id,
      tenantId: row.tenantId,
      teamId: row.teamId,
      createdBy: row.createdBy,
      practiceInfo,
      drills: mappedDrills,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
