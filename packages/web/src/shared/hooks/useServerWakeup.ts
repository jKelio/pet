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
 * Overall budget before the overlay gives up with `failed`. Render's free-tier
 * cold start usually takes 30–60 s but can run longer when the backend also
 * rebuilds; 150 s leaves comfortable headroom so a slow boot still resolves
 * before the user sees an error. Must stay ≤ the nginx proxy timeouts.
 */
const WAKEUP_TIMEOUT_MS = 150_000;

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
