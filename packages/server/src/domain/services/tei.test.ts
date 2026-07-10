import { describe, test, expect } from 'bun:test';
import type { Drill, PracticeInfo, PracticeSession, TimerData } from '@pet/shared';
import { TIME_MOVING_WITH_PUCK } from '@pet/shared';
import { computeTei } from './tei.js';

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

function session(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 's1',
    tenantId: 't1',
    teamId: 'team1',
    createdBy: 'u1',
    practiceInfo: practiceInfo(),
    drills: [],
    status: 'completed',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('computeTei', () => {
  test('uses the entered totalTime (minutes) as the denominator when set', () => {
    const s = session({
      practiceInfo: practiceInfo({ totalTime: 60 }),
      drills: [drill({ timerData: { [TIME_MOVING_WITH_PUCK]: timer(50 * 60_000) } })],
    });
    const result = computeTei(s);
    // 50/60 min active = 83.3% > 75% threshold
    expect(result.activity).toBe(40);
    expect(result.grade).not.toBe('F');
  });

  test('falls back to tracked duration when totalTime is 0, avoiding the auto-F', () => {
    const s = session({
      practiceInfo: practiceInfo({ totalTime: 0 }),
      drills: [drill({ timerData: { [TIME_MOVING_WITH_PUCK]: timer(45 * 60_000) } })],
    });
    const result = computeTei(s);
    expect(result.grade).not.toBe('F');
    expect(result.activity).toBe(40);
  });

  test('still returns the auto-F fallback when neither entered nor tracked time exist', () => {
    const s = session({ practiceInfo: practiceInfo({ totalTime: 0 }), drills: [drill()] });
    const result = computeTei(s);
    expect(result).toEqual({ activity: 10, coaching: 5, repetitions: 5, organisation: 5, total: 25, grade: 'F' });
  });
});
