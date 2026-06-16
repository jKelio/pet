import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createWakeupController,
  type WakeupController,
  type WakeupStatus,
} from '../lib/server-wakeup.js';
import { markServerReady } from '../lib/server-ready.js';

/** Health endpoint, configurable per deployment. Defaults to the proxied API. */
const HEALTH_URL = import.meta.env.VITE_HEALTH_URL ?? '/api/health';

/**
 * Overall budget before the overlay gives up with `failed`. When Render's edge
 * rate-limits simultaneous cold-start requests (HTTP 429), the controller backs
 * off for 120 s per attempt. Allow enough total time for several 429 cycles to
 * resolve — the sliding-window rate limit typically clears within one 120 s gap.
 */
const WAKEUP_TIMEOUT_MS = 600_000; // 10 minutes

/**
 * Backoff after a 429 rate-limited response. Must exceed Render's sliding-window
 * rate-limit window (empirically ~60 s) so the next probe lands outside the
 * window and is not rejected again. 120 s gives a 2× safety margin.
 */
const RATE_LIMITED_INTERVAL_MS = 120_000;

export interface ServerWakeup {
  status: WakeupStatus;
  /** Epoch ms when the current wake-up attempt began (for elapsed-time copy). */
  startedAt: number;
  /** Restart the probe after a failure. */
  retry: () => void;
}

/**
 * Probes the backend on mount and drives the wake-up state machine. Opens the
 * API-client gate once the server responds. Cleans up (aborts in-flight probes
 * and timers) on unmount.
 */
export function useServerWakeup(): ServerWakeup {
  const [status, setStatus] = useState<WakeupStatus>('checking');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const controllerRef = useRef<WakeupController | null>(null);

  useEffect(() => {
    const controller = createWakeupController({
      healthUrl: HEALTH_URL,
      timeoutMs: WAKEUP_TIMEOUT_MS,
      rateLimitedIntervalMs: RATE_LIMITED_INTERVAL_MS,
      onStatusChange: (next) => {
        setStatus(next);
        if (next === 'ready') markServerReady();
      },
    });
    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, []);

  const retry = useCallback(() => {
    setStartedAt(Date.now());
    controllerRef.current?.retry();
  }, []);

  return { status, startedAt, retry };
}
