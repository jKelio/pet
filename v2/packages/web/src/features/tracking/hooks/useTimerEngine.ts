import { useEffect, useRef } from 'react';
import { useTrackingStore } from '../stores/tracking.store.js';
import { useTimerStore } from '../stores/timer.store.js';

/**
 * Manages timer intervals and drill initialization.
 * Must be mounted inside TrackingPage when mode === 'timeWatcher'.
 */
export function useTimerEngine() {
  const drillsLength = useTrackingStore((s) => s.drills.length);
  const currentDrillIndex = useTrackingStore((s) => s.currentDrillIndex);
  const currentTimer = useTimerStore((s) => s.currentTimer);
  const drillActive = useTimerStore((s) => s.drillActive);

  const tick = useTimerStore((s) => s.tick);
  const tickWasteTime = useTimerStore((s) => s.tickWasteTime);
  const initForDrill = useTimerStore((s) => s.initForDrill);
  const resetAll = useTimerStore((s) => s.resetAll);

  // Stable refs to avoid stale closures in intervals
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const tickWasteRef = useRef(tickWasteTime);
  tickWasteRef.current = tickWasteTime;

  // Initialize or reset timer state when drill context changes
  useEffect(() => {
    if (drillsLength === 0) {
      resetAll();
      return;
    }
    const drill = useTrackingStore.getState().drills[currentDrillIndex];
    if (drill) initForDrill(drill);
  }, [currentDrillIndex, drillsLength, initForDrill, resetAll]);

  // Timer tick interval (100ms) — only runs when a timer is active
  useEffect(() => {
    if (!currentTimer) return;
    const id = setInterval(() => tickRef.current(), 100);
    return () => clearInterval(id);
  }, [currentTimer]);

  // Waste-time tick interval — runs when drill is active but no timer is running
  useEffect(() => {
    if (!drillActive || currentTimer) return;
    const id = setInterval(() => tickWasteRef.current(), 100);
    return () => clearInterval(id);
  }, [drillActive, currentTimer]);
}
