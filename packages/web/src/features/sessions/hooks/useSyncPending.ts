import { useEffect } from 'react';
import { useAuthStore } from '../../auth/stores/auth.store.js';
import { useAdminStore } from '../../admin/stores/admin.store.js';
import { useLocalSessionsStore } from '../stores/localSessions.store.js';

/**
 * Drains the local pending-sync outbox whenever the app has connectivity, an
 * access token and a team — on mount, once those become available, and when the
 * browser regains its network connection. This is what eventually syncs sessions
 * tracked offline at a dead-rink once the coach is back online.
 */
export function useSyncPending(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const teams = useAdminStore((s) => s.teams);
  const syncAllPending = useLocalSessionsStore((s) => s.syncAllPending);

  const teamKey = teams.map((t) => t.id).join(',');

  useEffect(() => {
    if (!accessToken || teams.length === 0) return;

    const drain = () => {
      if (navigator.onLine) void syncAllPending(accessToken, teams);
    };

    drain();
    window.addEventListener('online', drain);
    return () => window.removeEventListener('online', drain);
  }, [accessToken, teamKey, syncAllPending]); // eslint-disable-line react-hooks/exhaustive-deps
}
