import { describe, test, expect } from 'bun:test';
import type { Drill } from '@pet/shared';
import { TIME_MOVING_WITH_PUCK, TIME_MOVING_WITHOUT_PUCK, TIME_STATIONARY } from '@pet/shared';
import {
  formatRelativeTime,
  extractDrillDurations,
  aggregateTimeByActionForDrill,
  aggregateTimersAcrossDrills,
  aggregateCountersAcrossDrills,
} from './ganttUtils.js';

const t = ((key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key) as unknown as Parameters<
  typeof extractDrillDurations
>[1];

function makeDrill(overrides: Partial<Drill> = {}): Drill {
  return {
    id: 1,
    tags: [],
    actionButtons: [],
    timerData: {},
    counterData: {},
    wasteTime: { totalTime: 0, timeSegments: [] },
    ...overrides,
  };
}

describe('formatRelativeTime', () => {
  test('formats zero as 0:00', () => {
    expect(formatRelativeTime(0)).toBe('0:00');
  });

  test('formats 30 seconds', () => {
    expect(formatRelativeTime(30_000)).toBe('0:30');
  });

  test('formats 1 minute exactly', () => {
    expect(formatRelativeTime(60_000)).toBe('1:00');
  });

  test('formats 90 seconds as 1:30', () => {
    expect(formatRelativeTime(90_000)).toBe('1:30');
  });

  test('formats 10 minutes', () => {
    expect(formatRelativeTime(600_000)).toBe('10:00');
  });

  test('pads seconds below 10 with a leading zero', () => {
    expect(formatRelativeTime(65_000)).toBe('1:05');
  });

  test('truncates sub-second values', () => {
    expect(formatRelativeTime(1_500)).toBe('0:01');
  });
});

describe('extractDrillDurations', () => {
  // Realistic epoch-millis base; the code treats a falsy (0) timestamp as missing.
  const T0 = 1_700_000_000_000;

  test('spans from earliest timer start to latest timer end', () => {
    const drill = makeDrill({
      timerData: {
        passing: {
          totalTime: 20_000,
          timeSegments: [{ startTime: T0 + 1_000, endTime: T0 + 21_000, duration: 20_000 }],
        },
      },
    });

    const [d] = extractDrillDurations([drill], t);
    expect(d.duration).toBe(20_000);
  });

  test('trailing waste-time extends the drill span (matches "Zeit pro Drill")', () => {
    // Timer span is 0–31s; waste of 5s runs after the last timer stop.
    const drill = makeDrill({
      timerData: {
        passing: {
          totalTime: 31_000,
          timeSegments: [{ startTime: T0, endTime: T0 + 31_000, duration: 31_000 }],
        },
      },
      wasteTime: {
        totalTime: 5_000,
        timeSegments: [{ startTime: T0 + 31_000, endTime: T0 + 36_000, duration: 5_000 }],
      },
    });

    const [d] = extractDrillDurations([drill], t);
    // Span now reaches the end of the waste segment → 36s, like the bar chart total.
    expect(d.duration).toBe(36_000);
  });

  test('leading waste-time extends the drill span backwards', () => {
    const drill = makeDrill({
      timerData: {
        passing: {
          totalTime: 10_000,
          timeSegments: [{ startTime: T0 + 5_000, endTime: T0 + 15_000, duration: 10_000 }],
        },
      },
      wasteTime: {
        totalTime: 5_000,
        timeSegments: [{ startTime: T0, endTime: T0 + 5_000, duration: 5_000 }],
      },
    });

    const [d] = extractDrillDurations([drill], t);
    expect(d.duration).toBe(15_000);
  });

  test('sorts by drillId numerically, not alphabetically (Drill 2 before Drill 10)', () => {
    // Build 11 drills so that alphabetical order ("Drill 1","Drill 10","Drill 11","Drill 2"...)
    // differs from natural numeric order ("Drill 1","Drill 2",...,"Drill 11").
    const drills = Array.from({ length: 11 }, (_, i) =>
      makeDrill({
        id: i + 1,
        timerData: {
          passing: {
            totalTime: 10_000,
            timeSegments: [
              { startTime: T0 + i * 60_000, endTime: T0 + i * 60_000 + 10_000, duration: 10_000 },
            ],
          },
        },
      }),
    );

    const result = extractDrillDurations(drills, t);
    expect(result.map((d) => d.drillId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('aggregateTimeByActionForDrill', () => {
  test('merges the two puck timers into one combined "Time Moving" entry', () => {
    const drill = makeDrill({
      timerData: {
        explanation: { totalTime: 5_000, timeSegments: [] },
        [TIME_MOVING_WITH_PUCK]: { totalTime: 12_000, timeSegments: [] },
        [TIME_MOVING_WITHOUT_PUCK]: { totalTime: 8_000, timeSegments: [] },
      },
    });

    const result = aggregateTimeByActionForDrill(drill, t);

    // No separate with/without slices remain.
    expect(result.find((r) => r.actionId === TIME_MOVING_WITH_PUCK)).toBeUndefined();
    expect(result.find((r) => r.actionId === TIME_MOVING_WITHOUT_PUCK)).toBeUndefined();

    // One combined Time Moving entry summing both.
    const timeMoving = result.find((r) => r.actionId === 'timemoving');
    expect(timeMoving?.totalTime).toBe(20_000);

    // Other timers untouched.
    expect(result.find((r) => r.actionId === 'explanation')?.totalTime).toBe(5_000);
  });

  test('omits Time Moving when neither puck timer has time', () => {
    const drill = makeDrill({
      timerData: { explanation: { totalTime: 5_000, timeSegments: [] } },
    });

    const result = aggregateTimeByActionForDrill(drill, t);
    expect(result.find((r) => r.actionId === 'timemoving')).toBeUndefined();
  });

  test('timestationary appears as its own entry, not merged into timemoving', () => {
    const drill = makeDrill({
      timerData: {
        [TIME_STATIONARY]: { totalTime: 15_000, timeSegments: [] },
        [TIME_MOVING_WITH_PUCK]: { totalTime: 10_000, timeSegments: [] },
      },
    });

    const result = aggregateTimeByActionForDrill(drill, t);

    const stationary = result.find((r) => r.actionId === TIME_STATIONARY);
    expect(stationary?.totalTime).toBe(15_000);

    // Puck timer is unaffected by the stationary timer
    const timeMoving = result.find((r) => r.actionId === 'timemoving');
    expect(timeMoving?.totalTime).toBe(10_000);
  });
});

describe('aggregateTimersAcrossDrills', () => {
  test('sums totalTime and segment counts per actionId across drills', () => {
    const drills = [
      makeDrill({
        id: 1,
        timerData: {
          explanation: {
            totalTime: 5_000,
            timeSegments: [{ startTime: 1, endTime: 2, duration: 5_000 }],
          },
        },
      }),
      makeDrill({
        id: 2,
        timerData: {
          explanation: {
            totalTime: 3_000,
            timeSegments: [
              { startTime: 1, endTime: 2, duration: 1_000 },
              { startTime: 3, endTime: 4, duration: 2_000 },
            ],
          },
        },
      }),
    ];

    const result = aggregateTimersAcrossDrills(drills, t);
    const explanation = result.find((r) => r.actionId === 'explanation');
    expect(explanation?.totalTime).toBe(8_000);
    expect(explanation?.segments).toBe(3);
  });

  test('keeps the two puck timers separate (no Time-Moving merge)', () => {
    const drills = [
      makeDrill({
        timerData: {
          [TIME_MOVING_WITH_PUCK]: { totalTime: 12_000, timeSegments: [] },
          [TIME_MOVING_WITHOUT_PUCK]: { totalTime: 8_000, timeSegments: [] },
        },
      }),
    ];

    const result = aggregateTimersAcrossDrills(drills, t);
    expect(result.find((r) => r.actionId === TIME_MOVING_WITH_PUCK)?.totalTime).toBe(12_000);
    expect(result.find((r) => r.actionId === TIME_MOVING_WITHOUT_PUCK)?.totalTime).toBe(8_000);
    expect(result.find((r) => r.actionId === 'timemoving')).toBeUndefined();
  });

  test('excludes waste time and zero-time actions, sorts descending', () => {
    const drills = [
      makeDrill({
        timerData: {
          explanation: { totalTime: 5_000, timeSegments: [] },
          demonstration: { totalTime: 0, timeSegments: [] },
          passing: { totalTime: 9_000, timeSegments: [] },
        },
        wasteTime: {
          totalTime: 4_000,
          timeSegments: [{ startTime: 1, endTime: 2, duration: 4_000 }],
        },
      }),
    ];

    const result = aggregateTimersAcrossDrills(drills, t);
    expect(result.map((r) => r.actionId)).toEqual(['passing', 'explanation']);
    expect(result.find((r) => r.actionId === 'wasteTime')).toBeUndefined();
  });
});

describe('aggregateCountersAcrossDrills', () => {
  test('sums counts per actionId across drills, sorts descending', () => {
    const drills = [
      makeDrill({
        id: 1,
        counterData: {
          shots: { count: 3, timestamps: [] },
          passes: { count: 2, timestamps: [] },
        },
      }),
      makeDrill({
        id: 2,
        counterData: {
          shots: { count: 4, timestamps: [] },
        },
      }),
    ];

    const result = aggregateCountersAcrossDrills(drills, t);
    expect(result.map((r) => [r.actionId, r.count])).toEqual([
      ['shots', 7],
      ['passes', 2],
    ]);
  });

  test('omits counters with zero count', () => {
    const drills = [
      makeDrill({
        counterData: {
          shots: { count: 0, timestamps: [] },
          passes: { count: 1, timestamps: [] },
        },
      }),
    ];

    const result = aggregateCountersAcrossDrills(drills, t);
    expect(result.map((r) => r.actionId)).toEqual(['passes']);
  });
});
