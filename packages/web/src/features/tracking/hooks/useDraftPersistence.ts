import { useEffect, useRef } from 'react';
import { useTrackingStore } from '../stores/tracking.store.js';
import { db } from '../../sessions/lib/db.js';

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Auto-saves the current tracking session to IndexedDB as a draft.
 * Must be mounted at the TrackingPage level so it runs for the full session lifetime.
 */
export function useDraftPersistence() {
  const sessionId = useTrackingStore((s) => s.sessionId);
  const practiceInfo = useTrackingStore((s) => s.practiceInfo);
  const drills = useTrackingStore((s) => s.drills);
  const restoreFromDraft = useTrackingStore((s) => s.restoreFromDraft);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoredRef = useRef(false);

  // Restore draft on first mount
  useEffect(() => {
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;

    db.drafts
      .orderBy('savedAt')
      .last()
      .then((draft) => {
        if (draft && draft.drills.length > 0) {
          restoreFromDraft(draft.id, draft.practiceInfo, draft.drills);
        }
      })
      .catch(() => {
        // Silently ignore — fresh session
      });
  }, [restoreFromDraft]);

  // Debounced auto-save on state changes
  useEffect(() => {
    // Don't save an empty session
    if (drills.length === 0 && !practiceInfo.clubName) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      db.drafts.put({
        id: sessionId,
        practiceInfo,
        drills,
        savedAt: Date.now(),
      }).catch(() => {
        // Silently ignore storage errors
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId, practiceInfo, drills]);
}

/** Call after a session is completed to remove the draft and save to sessions table. */
export async function completeSession(
  sessionId: string,
  practiceInfo: ReturnType<typeof useTrackingStore.getState>['practiceInfo'],
  drills: ReturnType<typeof useTrackingStore.getState>['drills'],
): Promise<void> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const id = UUID_RE.test(sessionId) ? sessionId : crypto.randomUUID();
  await db.sessions.put({
    id,
    practiceInfo,
    drills,
    completedAt: Date.now(),
    syncedAt: null,
    teamId: null,
  });
  await db.drafts.delete(sessionId);
}
