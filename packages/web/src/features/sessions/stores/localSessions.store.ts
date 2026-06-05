import { create } from 'zustand';
import { db, type SavedSession } from '../lib/db.js';
import { syncSession, resolveSyncTeamId } from '../lib/sessionSync.js';

interface LocalSessionsStore {
  /** Completed sessions awaiting sync (the local outbox). */
  pending: SavedSession[];
  /** Ids currently being synced, for per-item spinners. */
  syncingIds: string[];
  /** Per-session sync error messages, keyed by session id. */
  errors: Record<string, string>;

  loadPending: () => Promise<void>;
  syncOne: (id: string, accessToken: string, teamId: string) => Promise<void>;
  /** Sync every pending session whose team is unambiguously resolvable; ambiguous/local-only ones are left. */
  syncAllPending: (accessToken: string, teams: ReadonlyArray<{ id: string }>) => Promise<void>;
  /** Remove a session from the local outbox (IndexedDB). */
  deleteOne: (id: string) => Promise<void>;
  /** Clear the local-only flag so a foreign session can be synced after all. */
  clearLocalOnly: (id: string) => Promise<void>;
}

export const useLocalSessionsStore = create<LocalSessionsStore>()((set, get) => ({
  pending: [],
  syncingIds: [],
  errors: {},

  loadPending: async () => {
    const rows = await db.sessions.toArray();
    rows.sort((a, b) => b.completedAt - a.completedAt);
    set({ pending: rows });
  },

  syncOne: async (id, accessToken, teamId) => {
    const session = get().pending.find((s) => s.id === id);
    if (!session) return;
    set((s) => ({
      syncingIds: [...s.syncingIds, id],
      errors: { ...s.errors, [id]: '' },
    }));
    try {
      await syncSession(session, accessToken, teamId);
    } catch (err) {
      set((s) => ({
        errors: { ...s.errors, [id]: err instanceof Error ? err.message : 'sync failed' },
      }));
    } finally {
      set((s) => ({ syncingIds: s.syncingIds.filter((x) => x !== id) }));
      await get().loadPending();
    }
  },

  syncAllPending: async (accessToken, teams) => {
    await get().loadPending();
    for (const session of get().pending) {
      if (session.localOnly) continue; // foreign/scouting session — never sync
      const teamId = resolveSyncTeamId(session, teams);
      if (!teamId) continue; // ambiguous team — needs a manual pick
      try {
        await syncSession(session, accessToken, teamId);
      } catch {
        // Leave failed sessions in the outbox; they retry on next reconnect.
      }
    }
    await get().loadPending();
  },

  deleteOne: async (id) => {
    await db.sessions.delete(id);
    await get().loadPending();
  },

  clearLocalOnly: async (id) => {
    await db.sessions.update(id, { localOnly: false });
    await get().loadPending();
  },
}));
