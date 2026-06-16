import { describe, test, expect } from 'bun:test';
import {
  createWakeupController,
  type WakeupStatus,
  type TimerHandle,
  type ProbeResult,
} from './server-wakeup.js';

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
      fetcher: async () => 'ok',
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
    let result: ProbeResult = 'not-ready';

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => result,
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
    result = 'ok';
    clock.advance(5000);
    await flush();
    expect(controller.getStatus()).toBe('ready');
  });

  test('gives up with "failed" after the overall timeout', async () => {
    const clock = makeClock();

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => 'not-ready',
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
    let result: ProbeResult = 'not-ready';

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => result,
      timeoutMs: 90_000,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    clock.advance(90_000);
    await flush();
    expect(controller.getStatus()).toBe('failed');

    // User taps "retry"; server is up now.
    result = 'ok';
    controller.retry();
    await flush();
    expect(controller.getStatus()).toBe('ready');
  });

  test('stop() aborts the flow and ignores in-flight probe results', async () => {
    const clock = makeClock();
    let resolveProbe!: (r: ProbeResult) => void;

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: () => new Promise<ProbeResult>((resolve) => { resolveProbe = resolve; }),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    controller.stop();

    // A late success from the aborted attempt must not flip status to ready.
    resolveProbe('ok');
    await flush();
    expect(controller.getStatus()).not.toBe('ready');
  });

  test('keeps only one probe in flight while a wake-through request hangs', async () => {
    const clock = makeClock();
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;

    const controller = createWakeupController({
      healthUrl: '/health',
      // A probe that never settles, mimicking nginx holding the wake-through
      // request open during a Render cold start.
      fetcher: () =>
        new Promise<ProbeResult>(() => {
          calls++;
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
        }),
      intervalMs: 5_000,
      timeoutMs: 90_000,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    await flush();

    // Advance well past many would-be poll intervals. Because the single probe
    // never settles, no further requests may be fired (parallel pings are what
    // trip Render's edge 429).
    clock.advance(60_000);
    await flush();

    expect(calls).toBe(1);
    expect(maxInFlight).toBe(1);
  });

  test('429 rate-limited response uses the longer backoff interval', async () => {
    const clock = makeClock();
    let result: ProbeResult = 'rate-limited';
    let callCount = 0;

    const controller = createWakeupController({
      healthUrl: '/health',
      fetcher: async () => {
        callCount++;
        return result;
      },
      intervalMs: 5_000,
      rateLimitedIntervalMs: 30_000,
      timeoutMs: 150_000,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    controller.start();
    await flush(); // first probe fires immediately, gets rate-limited

    expect(callCount).toBe(1);

    // After a normal interval (5s) there should be no new probe yet.
    clock.advance(5_000);
    await flush();
    expect(callCount).toBe(1);

    // Only after the rate-limited backoff (30s) does the next probe fire.
    clock.advance(25_000); // total 30s
    await flush();
    expect(callCount).toBe(2);

    // Now simulate server up — next probe after rate-limited backoff should succeed.
    result = 'ok';
    clock.advance(30_000);
    await flush();
    expect(controller.getStatus()).toBe('ready');
  });
});
