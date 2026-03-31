import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, User, Trash2, ChevronRight, CloudOff, Cloud, Loader2 } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { db, type SavedSession } from './lib/db.js';
import { useTrackingStore } from '../tracking/stores/tracking.store.js';
import { useTimerStore } from '../tracking/stores/timer.store.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from '../admin/stores/admin.store.js';
import { sessionApi } from './api/session.api.js';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function sessionTotalTime(session: SavedSession): number {
  const timerTime = session.drills.reduce(
    (sum, d) =>
      sum + Object.values(d.timerData ?? {}).reduce((s, td) => s + (td.totalTime ?? 0), 0),
    0,
  );
  const wasteTime =
    session.drills.reduce((sum, d) => sum + (d.wasteTime?.totalTime ?? 0), 0) +
    (session.practiceInfo.wasteTime?.totalTime ?? 0);
  return timerTime + wasteTime;
}

export function SessionHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const restoreFromDraft = useTrackingStore((s) => s.restoreFromDraft);
  const resetAll = useTimerStore((s) => s.resetAll);
  const accessToken = useAuthStore((s) => s.accessToken);
  const teams = useAdminStore((s) => s.teams);

  useEffect(() => {
    db.sessions
      .orderBy('completedAt')
      .reverse()
      .toArray()
      .then((rows) => {
        setSessions(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await db.sessions.delete(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleReopen = (session: SavedSession) => {
    resetAll();
    restoreFromDraft(session.id, session.practiceInfo, session.drills);
    navigate('/');
  };

  const handleViewResults = (session: SavedSession) => {
    restoreFromDraft(session.id, session.practiceInfo, session.drills);
    navigate('/sessions?view=1');
  };

  const handleSync = async (session: SavedSession) => {
    if (!accessToken) return;

    // Use session's stored teamId or pick the first available team
    const teamId = session.teamId ?? teams[0]?.id;
    if (!teamId) return;

    setSyncingId(session.id);
    try {
      await sessionApi.sync(
        { id: session.id, teamId, practiceInfo: session.practiceInfo, drills: session.drills },
        accessToken,
      );
      const now = Date.now();
      await db.sessions.update(session.id, { syncedAt: now, teamId });
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, syncedAt: now, teamId } : s)),
      );
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">Session-History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lokal gespeicherte Trainingseinheiten
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <p className="text-center text-muted-foreground py-12">Lädt…</p>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <CloudOff className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">Noch keine Sessions gespeichert.</p>
            <Button onClick={() => navigate('/')}>Tracking starten</Button>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((session) => {
              const pi = session.practiceInfo;
              const total = sessionTotalTime(session);
              return (
                <div
                  key={session.id}
                  className="rounded-lg border border-border bg-card p-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold truncate">
                        {pi.clubName || pi.teamName || 'Unbekannter Club'}
                        {pi.teamName && pi.clubName && ` — ${pi.teamName}`}
                      </span>
                      {!session.syncedAt && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                          Lokal
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(session.completedAt)}
                      </span>
                      {total > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(total)}
                        </span>
                      )}
                      {pi.athletesNumber > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {pi.athletesNumber}
                        </span>
                      )}
                      {pi.coachName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {pi.coachName}
                        </span>
                      )}
                      <span>{session.drills.length} Drills</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {accessToken && !session.syncedAt && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSync(session)}
                        disabled={syncingId === session.id}
                        title="In Cloud synchronisieren"
                      >
                        {syncingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Cloud className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleViewResults(session)}
                      title="Ergebnisse anzeigen"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleReopen(session)}
                      title="Session fortsetzen"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(session.id)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
