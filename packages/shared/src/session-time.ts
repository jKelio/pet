import type { PracticeSession } from './types.js';

type SessionForDuration = Pick<PracticeSession, 'drills' | 'practiceInfo'>;

/** Sum of all tracked timer time + waste time (ms). Timers never run in parallel. */
export function getTrackedDurationMs(session: SessionForDuration): number {
  const drillsMs = session.drills.reduce((sum, drill) => {
    const timersMs = Object.values(drill.timerData).reduce((s, td) => s + (td.totalTime ?? 0), 0);
    return sum + timersMs + (drill.wasteTime?.totalTime ?? 0);
  }, 0);
  return drillsMs + (session.practiceInfo.wasteTime?.totalTime ?? 0);
}

/** Entered practice duration (minutes → ms) if set, otherwise the tracked duration. */
export function getEffectiveDurationMs(session: SessionForDuration): number {
  const enteredMinutes = session.practiceInfo.totalTime;
  return enteredMinutes > 0 ? enteredMinutes * 60_000 : getTrackedDurationMs(session);
}
