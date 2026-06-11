import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils.js';
import { Button } from './ui/button.js';
import type { WakeupStatus } from '../lib/server-wakeup.js';

/** Wait this long after `waking` before fading in, to avoid a flash. */
const GRACE_MS = 1500;
/** Must match the CSS transition duration below. */
const FADE_MS = 300;

interface ServerWakeupOverlayProps {
  status: WakeupStatus;
  startedAt: number;
  onRetry: () => void;
}

/**
 * Semi-transparent overlay shown while the backend cold-starts. The app shell
 * stays visible underneath, so the user sees the app itself has already loaded.
 * Only renders for `waking`/`failed`; never for `checking`/`ready`.
 */
export function ServerWakeupOverlay({ status, startedAt, onRetry }: ServerWakeupOverlayProps) {
  const { t } = useTranslation();
  const active = status === 'waking' || status === 'failed';

  const [mounted, setMounted] = useState(false); // present in the DOM
  const [visible, setVisible] = useState(false); // opacity target for the fade
  const [elapsedMs, setElapsedMs] = useState(0);

  // Grace-delayed fade-in while active; fade-out then unmount when it clears.
  useEffect(() => {
    if (active) {
      // Failures are actionable, so surface them without the grace delay.
      const delay = status === 'failed' ? 0 : GRACE_MS;
      const showTimer = setTimeout(() => {
        setMounted(true);
        // Next frame so the opacity transition runs from 0 → 1.
        requestAnimationFrame(() => setVisible(true));
      }, delay);
      return () => clearTimeout(showTimer);
    }
    setVisible(false);
    const hideTimer = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(hideTimer);
  }, [active, status]);

  // Tick elapsed time so the message can rotate.
  useEffect(() => {
    if (!mounted) return;
    setElapsedMs(Date.now() - startedAt);
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [mounted, startedAt]);

  if (!mounted) return null;

  const wakingMessage =
    elapsedMs < 10_000
      ? t('serverWakeup.waking1')
      : elapsedMs < 30_000
        ? t('serverWakeup.waking2')
        : t('serverWakeup.waking3');

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center text-card-foreground shadow-lg">
        {status === 'failed' ? (
          <>
            <h2 className="text-lg font-semibold">{t('serverWakeup.failedTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('serverWakeup.failedBody')}</p>
            <Button className="mt-5" onClick={onRetry}>
              {t('serverWakeup.retry')}
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 rounded-full bg-secondary animate-wakeup-indeterminate" />
            </div>
            <p className="mt-5 text-sm text-foreground">{wakingMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}
