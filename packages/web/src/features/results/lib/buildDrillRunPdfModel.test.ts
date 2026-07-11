import { describe, test, expect } from 'bun:test';
import type { TFunction } from 'i18next';
import { PdfReportSchema, type Drill } from '@pet/shared';
import { buildDrillRunPdfModel } from './buildDrillRunPdfModel.js';

// Identity translator: returns the key (or defaultValue) as the label.
const t = ((key: string, opts?: { defaultValue?: string }) =>
  opts?.defaultValue ?? key) as unknown as TFunction;

function makeDrill(): Drill {
  const base = 1_000;
  return {
    id: 1,
    tags: ['skating'],
    actionButtons: [],
    timerData: {
      timemovingwithpuck: {
        totalTime: 5_000,
        timeSegments: [{ startTime: base, endTime: base + 5_000 }],
      },
      timemovingwithoutpuck: {
        totalTime: 3_000,
        timeSegments: [{ startTime: base + 5_000, endTime: base + 8_000 }],
      },
    },
    counterData: {
      shots: { count: 2, timestamps: [base + 2_000, base + 4_000] },
    },
    wasteTime: {
      totalTime: 2_000,
      timeSegments: [{ startTime: base + 8_000, endTime: base + 10_000 }],
    },
  };
}

describe('buildDrillRunPdfModel', () => {
  const sessionId = '3f0e8f9a-1b2c-4d5e-8f90-123456789abc';

  test('produces a model the server schema accepts', () => {
    const model = buildDrillRunPdfModel({
      sessionId,
      drill: makeDrill(),
      playerName: 'Mara Lindgren',
      drillLabel: 'Breakout 2-1',
      t,
      language: 'de',
    });

    const parsed = PdfReportSchema.safeParse(model);
    expect(parsed.success).toBe(true);
  });

  test('info carries only player name and date', () => {
    const model = buildDrillRunPdfModel({
      sessionId,
      drill: makeDrill(),
      playerName: 'Mara Lindgren',
      t,
      language: 'en',
    });

    expect(model.info.trackedPlayerName).toBe('Mara Lindgren');
    expect(model.info.date).toBeDefined();
    expect(model.info.clubName).toBeUndefined();
    expect(model.info.teamName).toBeUndefined();
    expect(model.info.coachName).toBeUndefined();
  });

  test('contains exactly one drill with the label prepended as a tag', () => {
    const model = buildDrillRunPdfModel({
      sessionId,
      drill: makeDrill(),
      drillLabel: 'Breakout 2-1',
      t,
      language: 'en',
    });

    expect(model.drills).toHaveLength(1);
    expect(model.drills[0].tags[0]).toBe('Breakout 2-1');
  });

  test('drops the session-level chart blocks', () => {
    const model = buildDrillRunPdfModel({ sessionId, drill: makeDrill(), t, language: 'en' });

    expect(model.drillTimeData).toBeUndefined();
    expect(model.drillOverview).toBeUndefined();
  });

  test('summary totals = drill timer time + drill waste time', () => {
    const model = buildDrillRunPdfModel({ sessionId, drill: makeDrill(), t, language: 'en' });

    expect(model.summary.drills).toBe(1);
    expect(model.summary.totalTime).toBe(5_000 + 3_000 + 2_000);
    // Passive = waste only (no passive coach timers in the fixture)
    expect(model.summary.passiveTime).toBe(2_000);
    expect(model.summary.passivePercent).toBe(20);
  });
});
