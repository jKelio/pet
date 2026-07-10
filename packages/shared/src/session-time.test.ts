import { describe, it, expect } from 'bun:test';
import { getTrackedDurationMs, getEffectiveDurationMs } from './session-time.js';
import type { Drill, PracticeInfo, TimerData } from './types.js';

function timer(totalTime: number): TimerData {
  return { totalTime, timeSegments: [] };
}

function drill(overrides: Partial<Drill> = {}): Drill {
  return {
    id: 1,
    tags: [],
    actionButtons: [],
    timerData: {},
    counterData: {},
    wasteTime: timer(0),
    ...overrides,
  };
}

function practiceInfo(overrides: Partial<PracticeInfo> = {}): PracticeInfo {
  return {
    clubName: '',
    teamName: '',
    date: '',
    coachName: '',
    athletesNumber: 1,
    coachesNumber: 1,
    totalTime: 0,
    trackedPlayerName: '',
    drillsNumber: 0,
    wasteTime: timer(0),
    ...overrides,
  };
}

describe('getTrackedDurationMs', () => {
  it('sums all timer totals and waste time across drills and practice info', () => {
    const session = {
      practiceInfo: practiceInfo({ wasteTime: timer(1_000) }),
      drills: [
        drill({ timerData: { explanation: timer(2_000), shooting: timer(3_000) }, wasteTime: timer(500) }),
        drill({ timerData: { explanation: timer(1_500) }, wasteTime: timer(0) }),
      ],
    };
    expect(getTrackedDurationMs(session)).toBe(1_000 + 2_000 + 3_000 + 500 + 1_500);
  });

  it('returns 0 when nothing was tracked', () => {
    const session = { practiceInfo: practiceInfo(), drills: [drill()] };
    expect(getTrackedDurationMs(session)).toBe(0);
  });
});

describe('getEffectiveDurationMs', () => {
  it('prefers the entered totalTime (minutes) when set', () => {
    const session = {
      practiceInfo: practiceInfo({ totalTime: 45 }),
      drills: [drill({ timerData: { explanation: timer(999_000) } })],
    };
    expect(getEffectiveDurationMs(session)).toBe(45 * 60_000);
  });

  it('falls back to the tracked duration when totalTime is 0', () => {
    const session = {
      practiceInfo: practiceInfo({ totalTime: 0 }),
      drills: [drill({ timerData: { explanation: timer(120_000) } })],
    };
    expect(getEffectiveDurationMs(session)).toBe(120_000);
  });

  it('returns 0 when both entered and tracked duration are empty', () => {
    const session = { practiceInfo: practiceInfo({ totalTime: 0 }), drills: [drill()] };
    expect(getEffectiveDurationMs(session)).toBe(0);
  });
});
