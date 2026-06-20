/**
 * Framework-agnostic controller for the Render.com "cold start" wake-up flow.
 *
 * The free-tier backend spins down after ~15 min of inactivity and needs
 * 30–60 s to boot. This controller probes a health endpoint and drives a small
 * state machine so the UI can show a friendly waiting screen — but only when
 * the server actually was asleep.
 *
 * Probes are **serialized**: at most one request is in flight at a time and the
 * next attempt is only scheduled once the current one resolves (plus a backoff
 * gap). Firing overlapping probes at a cold free instance trips Render's edge
 * into a `200 {"status":"rate-limited"}` response, so a real readiness check
 * (below) must also reject anything that isn't the genuine health payload.
 *
 * All timing/IO seams are injectable so the retry + timeout logic can be unit
 * tested without a DOM or real timers (the project has no jsdom/testing-library
 * and disallows new deps).
 */

export type WakeupStatus = 'checking' | 'waking' | 'ready' | 'failed';

export type TimerHandle = unknown;

export interface WakeupConfig {
  /** URL of the health endpoint to probe (e.g. `/api/health`). */
  healthUrl: string;
  /**
   * If the very first probe answers faster than this, the server was already
   * awake → go straight to `ready` and never reveal the overlay. Default 2000.
   */
  fastThresholdMs?: number;
  /** Backoff gap between serialized poll attempts once cold. Default 5000. */
  intervalMs?: number;
  /**
   * Per-attempt budget. Render holds a request open during the ~50 s cold
   * start, so each probe is given a generous timeout before being aborted and
   * retried. Default 70000.
   */
  probeTimeoutMs?: number;
  /** Overall budget before giving up and reporting `failed`. Default 120000. */
  timeoutMs?: number;
  /** Notified on every status transition. */
  onStatusChange?: (status: WakeupStatus) => void;

  // ── Injectable seams (default to the real environment) ──────────────────
  /** Resolves `true` only when the endpoint returns the genuine health payload. */
  fetcher?: (url: string, signal: AbortSignal) => Promise<boolean>;
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

export interface WakeupController {
  start(): void;
  stop(): void;
  retry(): void;
  getStatus(): WakeupStatus;
}

async function defaultFetcher(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal });
    // `res.ok` is necessary but NOT sufficient: Render's edge answers a cold
    // free instance with `200 {"status":"rate-limited"}` (and serves an HTML
    // interstitial to navigations). Only the genuine `{"status":"ok"}` payload
    // means the backend itself is actually up.
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: unknown };
    return body?.status === 'ok';
  } catch {
    // Network error / aborted / non-JSON (interstitial) → not reachable (yet).
    return false;
  }
}

export function createWakeupController(config: WakeupConfig): WakeupController {
  const {
    healthUrl,
    fastThresholdMs = 2000,
    intervalMs = 5000,
    probeTimeoutMs = 70000,
    timeoutMs = 120000,
    onStatusChange,
    fetcher = defaultFetcher,
    setTimer = (fn, ms) => setTimeout(fn, ms) as unknown as TimerHandle,
    clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  } = config;

  let status: WakeupStatus = 'checking';
  /** Bumped on every (re)start/stop/terminal transition to invalidate stale callbacks. */
  let generation = 0;
  /** Aborts the probe that is currently in flight. */
  let currentAbort: AbortController | null = null;
  const timers = new Set<TimerHandle>();

  function schedule(fn: () => void, ms: number): TimerHandle {
    const handle = setTimer(() => {
      timers.delete(handle);
      fn();
    }, ms);
    timers.add(handle);
    return handle;
  }

  function clearAllTimers(): void {
    for (const handle of timers) clearTimer(handle);
    timers.clear();
  }

  function setStatus(next: WakeupStatus): void {
    if (status === next) return;
    status = next;
    onStatusChange?.(next);
  }

  /** Freeze the machine and abort any in-flight probe. */
  function settle(next: WakeupStatus): void {
    generation++;
    clearAllTimers();
    currentAbort?.abort();
    currentAbort = null;
    setStatus(next);
  }

  function succeed(): void {
    if (status === 'ready') return;
    settle('ready');
  }

  function fail(): void {
    if (status === 'ready' || status === 'failed') return;
    settle('failed');
  }

  /** Run exactly one probe; on failure, schedule the next after a backoff gap. */
  async function runProbe(gen: number): Promise<void> {
    if (gen !== generation) return;

    const ac = new AbortController();
    currentAbort = ac;
    // Bound each attempt so a request Render never answers can't stall the loop.
    const timeoutHandle = schedule(() => ac.abort(), probeTimeoutMs);

    let ok = false;
    try {
      ok = await fetcher(healthUrl, ac.signal);
    } catch {
      ok = false;
    }

    timers.delete(timeoutHandle);
    clearTimer(timeoutHandle);

    // Aborted, stopped, restarted, or already settled → drop this result.
    if (gen !== generation) return;

    if (ok) {
      succeed();
      return;
    }
    // Cold/rate-limited → wait, then probe again (single in-flight at a time).
    schedule(() => void runProbe(gen), intervalMs);
  }

  function start(): void {
    generation++;
    const gen = generation;
    clearAllTimers();
    currentAbort?.abort();
    currentAbort = null;
    setStatus('checking');

    // Begin the serialized probe loop immediately.
    void runProbe(gen);

    // If it hasn't answered within the fast window, treat the server as cold
    // and reveal the "waking" overlay.
    schedule(() => {
      if (gen === generation && status === 'checking') setStatus('waking');
    }, fastThresholdMs);

    // Overall budget.
    schedule(() => {
      if (gen === generation) fail();
    }, timeoutMs);
  }

  function stop(): void {
    generation++;
    clearAllTimers();
    currentAbort?.abort();
    currentAbort = null;
  }

  return {
    start,
    stop,
    retry: start,
    getStatus: () => status,
  };
}
