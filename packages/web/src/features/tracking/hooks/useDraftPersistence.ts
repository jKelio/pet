import { useEffect, useRef } from 'react';
import { useTrackingStore, type Tracker } from '../stores/tracking.store.js';
import { db, type DraftSession } from '../../sessions/lib/db.js';

const SAVE_DEBOUNCE_MS = 1500;

/** Drafts written by the Training Tracker (legacy rows carry no kind). */
export const isTrainingDraft = (d: DraftSession): boolean => d.kind !== 'drillRun';
/** Crash-recovery drafts of an ephemeral Drill Run. */
export const isDrillRunDraft = (d: DraftSession): boolean => d.kind === 'drillRun';

/** A Drill Run with no recorded data must not leave a resumable draft behind. */
export function drillRunHasData(drills: DraftSession['drills']): boolean {
  const drill = drills[0];
  if (!drill) return false;
  return (
    Object.keys(drill.timerData).length > 0 ||
    Object.keys(drill.counterData).length > 0 ||
    drill.wasteTime.totalTime > 0 ||
    drill.tags.length > 0
  );
}

/**
 * Debounced auto-save of the current tracking state into IndexedDB drafts.
 * Saves only while the store belongs to the given tracker, so the Training
 * Tracker and the Drill Tracker never write each other's drafts.
 */
export function useDraftAutosave(tracker: Tracker) {
  const sessionId = useTrackingStore((s) => s.sessionId);
  const practiceInfo = useTrackingStore((s) => s.practiceInfo);
  const drills = useTrackingStore((s) => s.drills);
  const currentDrillIndex = useTrackingStore((s) => s.currentDrillIndex);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (useTrackingStore.getState().tracker !== tracker) return;
    // Don't persist read-only previews (cloud sessions or local pending sessions) as drafts
    if (sessionId.startsWith('cloud-') || sessionId.startsWith('local-')) return;
    // Don't save an empty session / an untouched Drill Run
    if (tracker === 'training' && drills.length === 0 && !practiceInfo.clubName) return;
    if (tracker === 'drill' && !drillRunHasData(drills)) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      db.drafts.put({
        id: sessionId,
        practiceInfo,
        drills,
        savedAt: Date.now(),
        currentDrillIndex,
        ...(tracker === 'drill' ? { kind: 'drillRun' as const } : {}),
      }).catch(() => {
        // Silently ignore storage errors
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tracker, sessionId, practiceInfo, drills, currentDrillIndex]);
}

/**
 * Auto-saves the current tracking session to IndexedDB as a draft.
 * Must be mounted at the TrackingPage level so it runs for the full session lifetime.
 */
export function useDraftPersistence() {
  const restoreFromDraft = useTrackingStore((s) => s.restoreFromDraft);
  const isRestoredRef = useRef(false);

  // Restore draft on first mount
  useEffect(() => {
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;

    db.drafts
      .orderBy('savedAt')
      .reverse()
      .filter(isTrainingDraft)
      .first()
      .then((draft) => {
        if (draft && draft.drills.length > 0) {
          restoreFromDraft(draft.id, draft.practiceInfo, draft.drills, draft.currentDrillIndex ?? 0);
        }
      })
      .catch(() => {
        // Silently ignore — fresh session
      });
  }, [restoreFromDraft]);

  useDraftAutosave('training');
}

export async function discardDraft(sessionId: string): Promise<void> {
  await db.drafts.delete(sessionId);
}

/** Call after a session is completed to remove the draft and save to sessions table. */
export async function completeSession(
  sessionId: string,
  practiceInfo: ReturnType<typeof useTrackingStore.getState>['practiceInfo'],
  drills: ReturnType<typeof useTrackingStore.getState>['drills'],
  tenantId: string | null = null,
  localOnly = false,
): Promise<string> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const id = UUID_RE.test(sessionId) ? sessionId : crypto.randomUUID();
  // Keep previously completed (still-unsynced) sessions — db.sessions acts as a
  // pending-sync outbox; rows are removed only once successfully synced.
  await db.sessions.put({
    id,
    practiceInfo,
    drills,
    completedAt: Date.now(),
    syncedAt: null,
    teamId: practiceInfo.teamId ?? null,
    tenantId,
    localOnly,
  });
  await db.drafts.delete(sessionId);
  return id;
}
