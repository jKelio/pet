import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { practiceSessions, drills } from '../db/schema.js';
import type { SessionRepository, FindSessionsOptions } from '../../domain/ports/session.repository.js';
import type { PracticeSession, Drill, PracticeInfo } from '@pet/shared';

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string, tenantId: string): Promise<PracticeSession | null> {
    const [row] = await this.db
      .select()
      .from(practiceSessions)
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    const drillRows = await this.db
      .select()
      .from(drills)
      .where(eq(drills.sessionId, id))
      .orderBy(drills.sequenceNumber);

    return this.toEntity(row, drillRows);
  }

  async findByTeam(teamId: string, tenantId: string, _options: FindSessionsOptions = {}): Promise<PracticeSession[]> {
    const rows = await this.db
      .select()
      .from(practiceSessions)
      .where(and(eq(practiceSessions.teamId, teamId), eq(practiceSessions.tenantId, tenantId)));

    return Promise.all(rows.map(async (row) => {
      const drillRows = await this.db
        .select()
        .from(drills)
        .where(eq(drills.sessionId, row.id))
        .orderBy(drills.sequenceNumber);
      return this.toEntity(row, drillRows);
    }));
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
          evaluation: info.evaluation,
          athletesCount: info.athletesNumber,
          coachesCount: info.coachesNumber,
          totalTimeMinutes: Math.floor(info.totalTime / 60000),
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
            evaluation: info.evaluation,
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

  private toEntity(row: typeof practiceSessions.$inferSelect, drillRows: (typeof drills.$inferSelect)[]): PracticeSession {
    const practiceInfo: PracticeInfo = {
      clubName: '',
      teamName: '',
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      coachName: row.coachName,
      evaluation: row.evaluation,
      athletesNumber: row.athletesCount,
      coachesNumber: row.coachesCount,
      totalTime: row.totalTimeMinutes * 60000,
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
