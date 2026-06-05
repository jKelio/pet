import type { TimerData, Drill, PracticeInfo } from '@pet/shared';
import { sessionApi } from '../api/session.api.js';
import { db, type SavedSession } from './db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Data normalizers (backward compat for sessions saved with old field names) ──

export function normalizeTimerData(raw: unknown): TimerData {
  const td = raw as Record<string, unknown>;
  const segs = Array.isArray(td?.timeSegments) ? td.timeSegments : [];
  return {
    totalTime: typeof td?.totalTime === 'number' ? td.totalTime : 0,
    timeSegments: segs.map((s: Record<string, unknown>) => {
      const startTime = typeof s.startTime === 'number' ? s.startTime : (s.start as number ?? 0);
      const endTime = typeof s.endTime === 'number' ? s.endTime
        : typeof s.end === 'number' ? s.end
        : null;
      const duration = typeof s.duration === 'number' ? s.duration
        : (endTime != null ? endTime - startTime : 0);
      return { startTime, endTime, duration };
    }),
  };
}

export function normalizeDrill(drill: Drill): Drill {
  return {
    ...drill,
    wasteTime: normalizeTimerData(drill.wasteTime),
    timerData: Object.fromEntries(
      Object.entries(drill.timerData ?? {}).map(([k, v]) => [k, normalizeTimerData(v)]),
    ),
  };
}

export function normalizePracticeInfo(pi: PracticeInfo): PracticeInfo {
  return {
    ...pi,
    totalTime: Math.round(pi.totalTime * 3_600_000),
    wasteTime: normalizeTimerData(pi.wasteTime),
  };
}

/**
 * Decide which registered team a completed session should sync to:
 * - the team the coach chose during tracking (when it still exists), else
 * - the only team the coach has (unambiguous), else
 * - null → ambiguous; do not auto-sync, let the coach pick in the pending list.
 */
export function resolveSyncTeamId(
  session: { practiceInfo: { teamId?: string } },
  teams: ReadonlyArray<{ id: string }>,
): string | null {
  const chosen = session.practiceInfo.teamId;
  if (chosen && teams.some((t) => t.id === chosen)) return chosen;
  if (teams.length === 1) return teams[0].id;
  return null;
}

/**
 * Sync a completed local session to the backend. On success the local copy is
 * deleted — db.sessions is a delete-on-sync outbox that holds only pending sessions.
 * Throws on failure so callers can surface or swallow the error.
 */
export async function syncSession(
  session: SavedSession,
  accessToken: string,
  teamId: string,
): Promise<void> {
  const syncId = UUID_RE.test(session.id) ? session.id : crypto.randomUUID();
  await sessionApi.sync(
    {
      id: syncId,
      teamId,
      practiceInfo: normalizePracticeInfo(session.practiceInfo),
      drills: session.drills.map(normalizeDrill),
    },
    accessToken,
  );
  await db.sessions.delete(session.id);
}
