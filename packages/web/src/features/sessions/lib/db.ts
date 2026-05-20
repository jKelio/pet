import Dexie, { type EntityTable } from 'dexie';
import type { PracticeInfo, Drill } from '@pet/shared';

// ── Schema ────────────────────────────────────────────────────────────────────

export interface DraftSession {
  /** Stable UUID for the current in-progress session */
  id: string;
  practiceInfo: PracticeInfo;
  drills: Drill[];
  savedAt: number;
}

export interface SavedSession {
  id: string;
  practiceInfo: PracticeInfo;
  drills: Drill[];
  completedAt: number;
  /** Set once the session has been synced to the backend */
  syncedAt: number | null;
  teamId: string | null;
  tenantId: string | null;
}

// ── Database ──────────────────────────────────────────────────────────────────

type PetDB = Dexie & {
  drafts: EntityTable<DraftSession, 'id'>;
  sessions: EntityTable<SavedSession, 'id'>;
};

const db = new Dexie('pet-v2') as PetDB;

db.version(1).stores({
  drafts: 'id, savedAt',
  sessions: 'id, completedAt, syncedAt',
});

db.version(2).stores({
  drafts: 'id, savedAt',
  sessions: 'id, completedAt, syncedAt, tenantId',
});

export { db };
