import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import i18n from './i18n.js';

/** How often to ask the browser to check for a new service worker (1 hour). */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and, when a new version is available, shows a
 * non-intrusive toast with a reload action instead of reloading automatically.
 * Auto-reload (registerType 'autoUpdate') is deliberately avoided: a coach may
 * be mid-session with running timers, and reloading would interrupt them.
 */
export function setupPWA(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast.info(i18n.t('pwa.updateAvailable', { ns: 'pet' }), {
        duration: Infinity,
        action: {
          label: i18n.t('pwa.reload', { ns: 'pet' }),
          onClick: () => updateSW(true),
        },
      });
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
      }
    },
  });
}
