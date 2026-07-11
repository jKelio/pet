import { describe, test, expect } from 'bun:test';
import type { Drill } from '@pet/shared';
import type { DraftSession } from '../../sessions/lib/db.js';
import { isTrainingDraft, isDrillRunDraft, drillRunHasData } from './useDraftPersistence.js';

function makeDrill(partial: Partial<Drill> = {}): Drill {
  return {
    id: 1,
    tags: [],
    actionButtons: [],
    timerData: {},
    counterData: {},
    wasteTime: { totalTime: 0, timeSegments: [] },
    ...partial,
  };
}

function makeDraft(kind?: 'drillRun'): DraftSession {
  return {
    id: 'x',
    practiceInfo: {} as DraftSession['practiceInfo'],
    drills: [],
    savedAt: 0,
    ...(kind ? { kind } : {}),
  };
}

describe('draft kind predicates', () => {
  test('legacy drafts without kind belong to the Training Tracker', () => {
    expect(isTrainingDraft(makeDraft())).toBe(true);
    expect(isDrillRunDraft(makeDraft())).toBe(false);
  });

  test('drillRun drafts belong to the Drill Tracker only', () => {
    expect(isTrainingDraft(makeDraft('drillRun'))).toBe(false);
    expect(isDrillRunDraft(makeDraft('drillRun'))).toBe(true);
  });
});

describe('drillRunHasData', () => {
  test('untouched drill has no data', () => {
    expect(drillRunHasData([makeDrill()])).toBe(false);
    expect(drillRunHasData([])).toBe(false);
  });

  test('any recorded timer, counter, waste time, or tag counts as data', () => {
    expect(
      drillRunHasData([
        makeDrill({ timerData: { x: { totalTime: 1, timeSegments: [] } } }),
      ]),
    ).toBe(true);
    expect(
      drillRunHasData([makeDrill({ counterData: { shots: { count: 1, timestamps: [] } } })]),
    ).toBe(true);
    expect(
      drillRunHasData([makeDrill({ wasteTime: { totalTime: 5, timeSegments: [] } })]),
    ).toBe(true);
    expect(drillRunHasData([makeDrill({ tags: ['skating'] })])).toBe(true);
  });
});
