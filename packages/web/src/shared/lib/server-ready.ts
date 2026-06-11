/**
 * A tiny gate the API client awaits before firing any request, so calls made
 * while the backend is still cold-starting are queued rather than failing.
 * `useServerWakeup` flips it open once the health probe succeeds; the queued
 * requests then resolve and run automatically.
 */

let ready = false;
let resolveReady!: () => void;
let readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

/** Resolves as soon as the server is confirmed reachable. */
export function whenServerReady(): Promise<void> {
  return ready ? Promise.resolve() : readyPromise;
}

/** Opens the gate, releasing any queued requests. Idempotent. */
export function markServerReady(): void {
  if (ready) return;
  ready = true;
  resolveReady();
}

/** True once the server has been confirmed reachable at least once. */
export function isServerReady(): boolean {
  return ready;
}

/**
 * Test-only: restore the closed (queued) state. Not used in app code — a real
 * session only ever transitions from "not ready" to "ready".
 */
export function __resetServerReady(): void {
  ready = false;
  readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
}
