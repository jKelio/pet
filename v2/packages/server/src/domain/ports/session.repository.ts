import type { PracticeSession, SessionStatus } from '@pet/shared';

export interface FindSessionsOptions {
  teamId?: string;
  status?: SessionStatus;
  limit?: number;
  offset?: number;
}

export interface SessionRepository {
  findById(id: string, tenantId: string): Promise<PracticeSession | null>;
  findByTeam(teamId: string, tenantId: string, options?: FindSessionsOptions): Promise<PracticeSession[]>;
  save(session: PracticeSession): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
}
