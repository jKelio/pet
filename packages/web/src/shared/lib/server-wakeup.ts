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
  /** Overall budget before giving up and reporting `failed`. Default 90000. */
  timeoutMs?: number;
  /** Notified on every status transition. */
  onStatusChange?: (status: WakeupStatus) => void;

  // ── Injectable seams (default to the real environment) ──────────────────
  /** Resolves `true` when the endpoint is reachable, `false` otherwise. */
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
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return false;
    // Render's free-tier cold-start interstitial is served as HTML and can carry
    // a 200 status — only the real backend answers with the `{ status: 'ok' }`
    // health payload. Verifying the body prevents the overlay from closing while
    // the app is still booting.
    const data = (await res.json().catch(() => null)) as { status?: string } | null;
    return data?.status === 'ok';
  } catch {
    // Network error / aborted / connection refused / non-JSON body → not reachable (yet).
    return false;
  }
}

export function createWakeupController(config: WakeupConfig): WakeupController {
  const {
    healthUrl,
    fastThresholdMs = 2000,
    intervalMs = 5000,
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
   * before they even reach the cold-starting container, so single-flight
   * probing (a long-lived "wake-through" request, then a backoff gap) is what
   * keeps the wake-up gentle.
   */
  function probe(gen: number): void {
    if (gen !== generation || abort === null) return;
    void fetcher(healthUrl, abort.signal).then((ok) => {
      if (gen !== generation) return;
      if (ok) {
        succeed();
        return;
      }
      // Settled without success → wait the interval, then probe again. Only
      // ever one request outstanding.
      schedule(() => probe(gen), intervalMs);
    });
  }

  function succeed(): void {
    if (status === 'ready') return;
    generation++; // freeze further attempts/timers
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
