import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { PracMetricsLogo } from './PracMetricsLogo.js';

/**
 * Render's free tier spins the backend down after ~15 min idle; the next request
 * triggers a ~50s cold start. This gate gently wakes it on app load: a single
 * in-flight GET /api/health at a time, with a long per-attempt timeout (Render
 * holds the request open while spinning up), retried sequentially with backoff.
 *
 * It is deliberately NOT aggressive — parallel/rapid pings make Render's edge
 * reject the burst with 429 before the container is even up.
 *
 * Offline-first: PET works offline (Dexie), so once the budget is exhausted we
 * render the app regardless of whether the server answered — the gate must never
 * trap the user.
 */

const ATTEMPT_TIMEOUT_MS = 70_000;   // generous enough for a free-tier cold start
const BACKOFF_MS = 3_000;            // pause between sequential attempts
const TOTAL_BUDGET_MS = 120_000;     // give up waiting after this and let the app load

async function pingHealth(signal: AbortSignal): Promise<boolean> {
  const timeout = new AbortController();
  const onAbort = () => timeout.abort();
  signal.addEventListener('abort', onAbort);
  const timer = setTimeout(() => timeout.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/health', { signal: timeout.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });

export function WakeupGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('pet');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hand off from the static index.html splash to this React overlay.
    document.getElementById('splash')?.remove();

    const controller = new AbortController();
    const deadline = Date.now() + TOTAL_BUDGET_MS;

    (async () => {
      while (!controller.signal.aborted && Date.now() < deadline) {
        if (await pingHealth(controller.signal)) break;
        if (Date.now() >= deadline) break;
        await sleep(BACKOFF_MS, controller.signal);
      }
      if (!controller.signal.aborted) setReady(true);
    })();

    return () => controller.abort();
  }, []);

  if (ready) return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
      style={{ background: 'radial-gradient(900px 600px at 50% -5%, #0d1c39, #03101f 60%)' }}
    >
      <PracMetricsLogo variant="stacked" />
      <div className="flex items-center gap-2 text-sm" style={{ color: '#8fa0bb' }}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('wakeup.title')}</span>
      </div>
      <p className="max-w-xs px-6 text-center text-xs" style={{ color: '#5e6f8c' }}>
        {t('wakeup.subtitle')}
      </p>
    </div>
  );
}
