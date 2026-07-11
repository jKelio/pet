import { useEffect, useRef, useState } from 'react';
import { useTrackingStore } from '../../tracking/stores/tracking.store.js';
import {
  useDraftAutosave,
  isDrillRunDraft,
  drillRunHasData,
  discardDraft,
} from '../../tracking/hooks/useDraftPersistence.js';
import { db } from '../../sessions/lib/db.js';

/**
 * Seeds the tracking store for a Drill Run on mount: restores the newest
 * drill-run crash-recovery draft if one holds recorded data, otherwise starts
 * a fresh run. Mounts the drill-run autosave for the lifetime of the page.
 */
export function useDrillRunDraft() {
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    db.drafts
      .orderBy('savedAt')
      .reverse()
      .filter(isDrillRunDraft)
      .first()
      .then((draft) => {
        if (draft && drillRunHasData(draft.drills)) {
          useTrackingStore
            .getState()
            .restoreFromDraft(draft.id, draft.practiceInfo, draft.drills, 0, 'drill');
          setShowResumePrompt(true);
        } else {
          useTrackingStore.getState().startDrillRun();
        }
      })
      .catch(() => {
        useTrackingStore.getState().startDrillRun();
      });
  }, []);

  useDraftAutosave('drill');

  const resumeRun = () => setShowResumePrompt(false);

  const startNewRun = async () => {
    await discardDraft(useTrackingStore.getState().sessionId);
    useTrackingStore.getState().startDrillRun();
    setShowResumePrompt(false);
  };

  return { showResumePrompt, resumeRun, startNewRun };
}
