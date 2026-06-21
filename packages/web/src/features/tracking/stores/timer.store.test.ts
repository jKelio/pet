import { describe, test, expect, beforeEach } from 'bun:test';
import {
  TIME_MOVING_WITH_PUCK,
  TIME_MOVING_WITHOUT_PUCK,
  TIME_STATIONARY,
  type Drill,
} from '@pet/shared';
import { useTimerStore } from './timer.store.js';
import { useTrackingStore } from './tracking.store.js';

function makeDrill(): Drill {
  return {
    id: 1,
    tags: [],
    actionButtons: [
      { id: TIME_MOVING_WITH_PUCK, type: 'timer', enabled: true },
      { id: TIME_MOVING_WITHOUT_PUCK, type: 'timer', enabled: true },
      { id: TIME_STATIONARY, type: 'timer', enabled: true },
      { id: 'explanation', type: 'timer', enabled: true },
      { id: 'shots', type: 'counter', enabled: true },
      { id: 'passes', type: 'counter', enabled: true },
    ],
    timerData: {},
    counterData: {},
    wasteTime: { totalTime: 0, timeSegments: [] },
  };
}

function setup() {
  const drill = makeDrill();
  useTrackingStore.getState().setDrills([drill]);
  useTrackingStore.getState().setCurrentDrillIndex(0);
  useTimerStore.getState().resetAll();
  useTimerStore.getState().startDrill();
  useTimerStore.getState().initForDrill(drill);
}

describe('timer.store puck-release coupling', () => {
  beforeEach(setup);

  test('Shot while moving with the puck switches Time Moving to without puck', () => {
    const store = useTimerStore.getState();
    store.startTimer(TIME_MOVING_WITH_PUCK);
    expect(useTimerStore.getState().currentTimer).toBe(TIME_MOVING_WITH_PUCK);

    store.incrementCounter('shots');

    expect(useTimerStore.getState().currentTimer).toBe(TIME_MOVING_WITHOUT_PUCK);
    expect(useTimerStore.getState().counters['shots'].count).toBe(1);
  });

  test('Pass while already without puck stays without puck (counts only)', () => {
    const store = useTimerStore.getState();
    store.startTimer(TIME_MOVING_WITHOUT_PUCK);

    store.incrementCounter('passes');

    expect(useTimerStore.getState().currentTimer).toBe(TIME_MOVING_WITHOUT_PUCK);
    expect(useTimerStore.getState().counters['passes'].count).toBe(1);
  });

  test('Pass with no puck timer running is a plain counter tap', () => {
    const store = useTimerStore.getState();
    expect(useTimerStore.getState().currentTimer).toBeNull();

    store.incrementCounter('passes');

    expect(useTimerStore.getState().currentTimer).toBeNull();
    expect(useTimerStore.getState().counters['passes'].count).toBe(1);
  });

  test('Shot while a non-puck timer runs does not start a puck timer', () => {
    const store = useTimerStore.getState();
    store.startTimer('explanation');

    store.incrementCounter('shots');

    expect(useTimerStore.getState().currentTimer).toBe('explanation');
    expect(useTimerStore.getState().counters['shots'].count).toBe(1);
  });
});

describe('timer.store timestationary — no puck-release coupling', () => {
  beforeEach(setup);

  test('Pass while timestationary keeps the timer running', () => {
    const store = useTimerStore.getState();
    store.startTimer(TIME_STATIONARY);

    store.incrementCounter('passes');

    expect(useTimerStore.getState().currentTimer).toBe(TIME_STATIONARY);
    expect(useTimerStore.getState().counters['passes'].count).toBe(1);
  });

  test('Shot while timestationary keeps the timer running', () => {
    const store = useTimerStore.getState();
    store.startTimer(TIME_STATIONARY);

    store.incrementCounter('shots');

    expect(useTimerStore.getState().currentTimer).toBe(TIME_STATIONARY);
    expect(useTimerStore.getState().counters['shots'].count).toBe(1);
  });

  test('Starting a puck timer while timestationary stops the stationary timer', () => {
    const store = useTimerStore.getState();
    store.startTimer(TIME_STATIONARY);
    store.startTimer(TIME_MOVING_WITH_PUCK);

    expect(useTimerStore.getState().currentTimer).toBe(TIME_MOVING_WITH_PUCK);
    expect(useTimerStore.getState().timers[TIME_STATIONARY]?.isRunning).toBe(false);
  });
});
