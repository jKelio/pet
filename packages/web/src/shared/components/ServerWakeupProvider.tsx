import type { ReactNode } from 'react';
import { useServerWakeup } from '../hooks/useServerWakeup.js';
import { ServerWakeupOverlay } from './ServerWakeupOverlay.js';

/**
 * Runs the wake-up probe and renders the overlay above the app. Children (the
 * app shell) render immediately underneath, so the user sees a loaded app while
 * the backend cold-starts.
 */
export function ServerWakeupProvider({ children }: { children: ReactNode }) {
  const { status, startedAt, retry } = useServerWakeup();
  return (
    <>
      {children}
      <ServerWakeupOverlay status={status} startedAt={startedAt} onRetry={retry} />
    </>
  );
}
