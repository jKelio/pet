import { describe, test, expect } from 'bun:test';
import { createWakeupController, type WakeupStatus, type TimerHandle } from './server-wakeup.js';

/**
 * Deterministic clock + scheduler so the retry/timeout logic can be driven
 * synchronously without real timers.
 */
function makeClock() {
  let nowMs = 0;
  let nextId = 1;
  const tasks = new Map<number, { time: number; fn: () => void }>();

  return {
    setTimer: (fn: () => void, ms: number): TimerHandle => {
      const id = nextId++;
      tasks.set(id, { time: nowMs + ms, fn });
      return id;
    },
    clearTimer: (handle: TimerHandle) => {
      tasks.delete(handle as number);
    },
    /** Advance time, firing due timers in chronological order. */
    advance(ms: number) {
      const target = nowMs + ms;
      while (true) {
        let due: { id: number; time: number; fn: () => void } | null = null;
        for (const [id, t] of tasks) {
          if (t.time <= target && (due === null || t.time < due.time)) {
            due = { id, time: t.time, fn: t.fn };
          }
        }
        if (due === null) break;
        tasks.delete(due.id);
        nowMs = due.time;
        due.fn();
      }
      nowMs = target;
    },
  };
}

/** Let queued promise `.then` callbacks (the health probes) run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('createWakeupController', () => {
  test('first response under the fast threshold → ready, never shows "waking"', async () => {
    const clock = makeClock();
    const transitions: WakeupStatus[] = [];

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => true, // server already awake
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      onStatusChange: (s) => transitions.push(s),
    });

    controller.start();
    await flush(); // first probe resolves

    expect(controller.getStatus()).toBe('ready');
    expect(transitions).not.toContain('waking');
  });

  test('cold server reveals "waking" after the fast threshold, then becomes ready', async () => {
    const clock = makeClock();
    let reachable = false;

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => reachable,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    await flush();
    expect(controller.getStatus()).toBe('checking');

    // Cross the 2s fast threshold with no answer → waking + polling begins.
    clock.advance(2000);
    await flush();
    expect(controller.getStatus()).toBe('waking');

    // Backend boots; the next 5s poll succeeds.
    reachable = true;
    clock.advance(5000);
    await flush();
    expect(controller.getStatus()).toBe('ready');
  });

  test('gives up with "failed" after the overall timeout', async () => {
    const clock = makeClock();

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => false, // never reachable
      timeoutMs: 90_000,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    await flush();

    clock.advance(89_000);
    await flush();
    expect(controller.getStatus()).toBe('waking');

    clock.advance(1000); // hit 90s
    await flush();
    expect(controller.getStatus()).toBe('failed');
  });

  test('retry() restarts the flow and can recover after a failure', async () => {
    const clock = makeClock();
    let reachable = false;

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => reachable,
      timeoutMs: 90_000,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    clock.advance(90_000);
    await flush();
    expect(controller.getStatus()).toBe('failed');

    // User taps "retry"; server is up now.
    reachable = true;
    controller.retry();
    await flush();
    expect(controller.getStatus()).toBe('ready');
  });

  test('stop() aborts the flow and ignores in-flight probe results', async () => {
    const clock = makeClock();
    let resolveProbe!: (ok: boolean) => void;

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: () => new Promise<boolean>((resolve) => { resolveProbe = resolve; }),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    controller.stop();

    // A late success from the aborted attempt must not flip status to ready.
    resolveProbe(true);
    await flush();
    expect(controller.getStatus()).not.toBe('ready');
  });
});
