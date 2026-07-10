import type { PracticeSession } from '@pet/shared';

/** Keyset cursor pointing at the last item of a page (newest-first ordering). */
export interface SessionCursor {
  /** Practice date (YYYY-MM-DD); null when the session has no date (sorts last). */
  date: string | null;
  /** ISO timestamp — tiebreaker for sessions on the same date. */
  createdAt: string;
  /** Final tiebreaker for identical date + createdAt. */
  id: string;
}

export interface FindSessionsOptions {
  /** Max items to return; omit to fetch all. */
  limit?: number;
  /** Only return sessions strictly older than this cursor. */
  before?: SessionCursor;
}

export interface SessionPageResult {
  items: PracticeSession[];
  /** Cursor for the next (older) page, or null when this page is the last. */
  nextCursor: SessionCursor | null;
}

export interface SessionRepository {
  findById(id: string, tenantId: string): Promise<PracticeSession | null>;
  findByTeam(teamId: string, tenantId: string, options?: FindSessionsOptions): Promise<SessionPageResult>;
  save(session: PracticeSession): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
}
