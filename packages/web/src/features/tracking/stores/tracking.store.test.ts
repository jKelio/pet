import { describe, test, expect, beforeEach } from 'bun:test';
import { DEFAULT_ACTION_BUTTONS } from '@pet/shared';
import { useTrackingStore } from './tracking.store.js';

describe('tracking.store Drill Runs', () => {
  beforeEach(() => {
    useTrackingStore.getState().resetAllData();
  });

  test('startDrillRun seeds one drill and jumps to the live surface', () => {
    const before = useTrackingStore.getState().sessionId;

    useTrackingStore.getState().startDrillRun();

    const state = useTrackingStore.getState();
    expect(state.tracker).toBe('drill');
    expect(state.mode).toBe('timeWatcher');
    expect(state.sessionType).toBe('open');
    expect(state.sessionId).not.toBe(before);
    expect(state.drills).toHaveLength(1);
    expect(state.drills[0].actionButtons.map((a) => a.id)).toEqual(
      DEFAULT_ACTION_BUTTONS.map((a) => a.id),
    );
    expect(state.currentDrillIndex).toBe(0);
    expect(state.practiceInfo.sessionType).toBe('open');
    expect(state.practiceInfo.drillsNumber).toBe(1);
    expect(state.practiceInfo.wasteTime).toEqual({ totalTime: 0, timeSegments: [] });
  });

  test('resetAllData returns the store to the Training Tracker', () => {
    useTrackingStore.getState().startDrillRun();

    useTrackingStore.getState().resetAllData();

    const state = useTrackingStore.getState();
    expect(state.tracker).toBe('training');
    expect(state.mode).toBe('practiceInfo');
    expect(state.drills).toHaveLength(0);
  });

  test('restoreFromDraft defaults to the Training Tracker', () => {
    const { practiceInfo, drills } = (() => {
      useTrackingStore.getState().startDrillRun();
      const s = useTrackingStore.getState();
      return { practiceInfo: s.practiceInfo, drills: s.drills };
    })();
    useTrackingStore.getState().resetAllData();

    useTrackingStore.getState().restoreFromDraft('some-id', practiceInfo, drills, 0);

    expect(useTrackingStore.getState().tracker).toBe('training');
    expect(useTrackingStore.getState().mode).toBe('timeWatcher');
  });

  test('restoreFromDraft with tracker=drill restores a Drill Run', () => {
    useTrackingStore.getState().startDrillRun();
    const s = useTrackingStore.getState();
    const { sessionId, practiceInfo, drills } = s;
    useTrackingStore.getState().resetAllData();

    useTrackingStore.getState().restoreFromDraft(sessionId, practiceInfo, drills, 0, 'drill');

    const restored = useTrackingStore.getState();
    expect(restored.tracker).toBe('drill');
    expect(restored.mode).toBe('timeWatcher');
    expect(restored.sessionType).toBe('open');
    expect(restored.drills).toHaveLength(1);
  });
});
