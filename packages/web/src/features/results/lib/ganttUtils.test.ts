import { describe, test, expect } from 'bun:test';
import type { Drill } from '@pet/shared';
import { formatRelativeTime, extractDrillDurations } from './ganttUtils.js';

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
});
