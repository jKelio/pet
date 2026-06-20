import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createWakeupController,
  type WakeupController,
  type WakeupStatus,
} from '../lib/server-wakeup.js';
import { markServerReady } from '../lib/server-ready.js';
import { mountServerWakeFrame } from '../lib/server-wake-iframe.js';

/** Health endpoint, configurable per deployment. Defaults to the proxied API. */
const HEALTH_URL = import.meta.env.VITE_HEALTH_URL ?? '/api/health';

/**
 * Absolute backend health URL loaded in a hidden iframe to wake the spun-down
 * Render free instance. Render's edge only boots the container on a navigation
 * (which an iframe performs); the `/api/health` fetch is rate-limited and never
 * wakes it. Defaults to the production backend; override per deployment.
 */
const SERVER_WAKE_URL =
  import.meta.env.VITE_SERVER_WAKE_URL ?? 'https://pet-server-a736.onrender.com/health';

/** Overall budget before the overlay gives up with `failed`. */
const WAKEUP_TIMEOUT_MS = 600_000; // 10 minutes

/**
 * Poll cadence while the server is still cold. The hidden iframe (see below)
 * does the actual waking, so this fetch only needs to detect readiness — it can
 * poll briskly and a rate-limited response simply means "not up yet".
 */
const RATE_LIMITED_INTERVAL_MS = 5_000;

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
  const unmountFrameRef = useRef<(() => void) | null>(null);

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
      unmountFrameRef.current?.();
      unmountFrameRef.current = null;
    };
  }, []);

  // While the server is confirmed cold ('waking'), drive Render's cold-start
  // wake with a hidden iframe navigation — a `fetch` to /api/health is
  // rate-limited by Render's edge and never boots the instance. Tear the iframe
  // down as soon as the server is up (or the attempt ends). Production-only:
  // local/dev backends never spin down, so the overlay never reaches 'waking'.
  useEffect(() => {
    if (!import.meta.env.PROD || !SERVER_WAKE_URL) return;
    if (status === 'waking') {
      if (!unmountFrameRef.current) {
        unmountFrameRef.current = mountServerWakeFrame(SERVER_WAKE_URL);
      }
    } else {
      unmountFrameRef.current?.();
      unmountFrameRef.current = null;
    }
  }, [status]);

  const retry = useCallback(() => {
    setStartedAt(Date.now());
    controllerRef.current?.retry();
  }, []);

  return { status, startedAt, retry };
}
