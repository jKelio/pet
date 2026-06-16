/**
 * Framework-agnostic controller for the Render.com "cold start" wake-up flow.
 *
 * The free-tier backend spins down after ~15 min of inactivity and needs
 * 30–60 s to boot. This controller probes a health endpoint and drives a small
 * state machine so the UI can show a friendly waiting screen — but only when
 * the server actually was asleep.
 *
 * All timing/IO seams are injectable so the retry + timeout logic can be unit
 * tested without a DOM or real timers (the project has no jsdom/testing-library
 * and disallows new deps).
 */

export type WakeupStatus = 'checking' | 'waking' | 'ready' | 'failed';

export type TimerHandle = unknown;

/** Result of a single health probe. */
export type ProbeResult = 'ok' | 'not-ready' | 'rate-limited';

export interface WakeupConfig {
  /** URL of the health endpoint to probe (e.g. `/api/health`). */
  healthUrl: string;
  /**
   * If the very first probe answers faster than this, the server was already
   * awake → go straight to `ready` and never reveal the overlay. Default 2000.
   */
  fastThresholdMs?: number;
  /** Backoff gap between sequential probes (applied after each one settles). Default 5000. */
  intervalMs?: number;
  /**
   * Backoff after a 429 rate-limited response. Must be long enough to let
   * Render's sliding-window rate limit clear before the next attempt.
   * Default 30000.
   */
  rateLimitedIntervalMs?: number;
  /** Overall budget before giving up and reporting `failed`. Default 90000. */
  timeoutMs?: number;
  /** Notified on every status transition. */
  onStatusChange?: (status: WakeupStatus) => void;

  // ── Injectable seams (default to the real environment) ──────────────────
  /**
   * Resolves 'ok' when the endpoint is reachable and healthy, 'rate-limited'
   * when Render's edge rejects the request with HTTP 429, and 'not-ready'
   * otherwise.
   */
  fetcher?: (url: string, signal: AbortSignal) => Promise<ProbeResult>;
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

export interface WakeupController {
  start(): void;
  stop(): void;
  retry(): void;
  getStatus(): WakeupStatus;
}

async function defaultFetcher(url: string, signal: AbortSignal): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    });
    // Render's edge returns 429 when it rate-limits cold-start wakeup pings.
    // Signal this back so the controller can apply a longer backoff instead of
    // immediately retrying (which would keep the sliding window open).
    if (res.status === 429) return 'rate-limited';
    if (!res.ok) return 'not-ready';
    // Render's free-tier cold-start interstitial is served as HTML and can carry
    // a 200 status — only the real backend answers with the `{ status: 'ok' }`
    // health payload. Verifying the body prevents the overlay from closing while
    // the app is still booting.
    const data = (await res.json().catch(() => null)) as { status?: string } | null;
    return data?.status === 'ok' ? 'ok' : 'not-ready';
  } catch {
    // Network error / aborted / connection refused → not reachable (yet).
    return 'not-ready';
  }
}

export function createWakeupController(config: WakeupConfig): WakeupController {
  const {
    healthUrl,
    fastThresholdMs = 2000,
    intervalMs = 5000,
    rateLimitedIntervalMs = 30_000,
    timeoutMs = 90000,
    onStatusChange,
    fetcher = defaultFetcher,
    setTimer = (fn, ms) => setTimeout(fn, ms) as unknown as TimerHandle,
    clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  } = config;

  let status: WakeupStatus = 'checking';
  /** Bumped on every (re)start/stop to invalidate stale async callbacks. */
  let generation = 0;
  let abort: AbortController | null = null;
  const timers = new Set<TimerHandle>();

  function schedule(fn: () => void, ms: number): void {
    const handle = setTimer(() => {
      timers.delete(handle);
      fn();
    }, ms);
    timers.add(handle);
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

  /**
   * One probe in the wake-up loop. The next probe is scheduled only *after*
   * this one settles, so there is never more than a single request in flight.
   * Render's free-tier edge rejects parallel/rapid wakeup pings with HTTP 429
   * before they even reach the cold-starting container.
   *
   * When a 429 is received the controller backs off for `rateLimitedIntervalMs`
   * (default 30 s) instead of the normal `intervalMs` (5 s), giving Render's
   * sliding-window rate limit time to clear before the next attempt.
   */
  function probe(gen: number): void {
    if (gen !== generation || abort === null) return;
    void fetcher(healthUrl, abort.signal).then((result) => {
      if (gen !== generation) return;
      if (result === 'ok') {
        succeed();
        return;
      }
      const delay = result === 'rate-limited' ? rateLimitedIntervalMs : intervalMs;
      schedule(() => probe(gen), delay);
    });
  }

  function succeed(): void {
    if (status === 'ready') return;
    generation++;
    clearAllTimers();
    abort?.abort();
    setStatus('ready');
  }

  function fail(): void {
    if (status === 'ready' || status === 'failed') return;
    generation++;
    clearAllTimers();
    abort?.abort();
    setStatus('failed');
  }

  function start(): void {
    generation++;
    const gen = generation;
    clearAllTimers();
    abort = new AbortController();
    setStatus('checking');

    // Start the single-flight probe loop. The first probe doubles as the
    // fast-path check: if the server is already awake it resolves before the
    // fast window below and the overlay never appears.
    probe(gen);

    // If we're still checking once the fast window elapses, the server was
    // asleep — reveal the "waking" overlay. The probe loop is already running,
    // so no extra request is fired here (that could trip an edge 429).
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
    abort?.abort();
    abort = null;
  }

  return {
    start,
    stop,
    retry: start,
    getStatus: () => status,
  };
}
