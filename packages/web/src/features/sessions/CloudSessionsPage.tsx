import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Cloud, Clock, Users, User, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from '../admin/stores/admin.store.js';
import { useTrackingStore } from '../tracking/stores/tracking.store.js';
import { useTimerStore } from '../tracking/stores/timer.store.js';
import { sessionApi } from './api/session.api.js';
import i18n from '../../lib/i18n.js';
import type { PracticeSession } from '@pet/shared';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function CloudSessionsPage() {
  const { t } = useTranslation('pet');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const teams = useAdminStore((s) => s.teams);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreFromDraft = useTrackingStore((s) => s.restoreFromDraft);
  const resetAll = useTimerStore((s) => s.resetAll);

  // Pre-select first team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Load sessions when team changes
  useEffect(() => {
    if (!selectedTeamId || !accessToken) return;
    setLoading(true);
    setError(null);
    sessionApi
      .listByTeam(selectedTeamId, accessToken)
      .then(setSessions)
      .catch(() => setError(t('sessions.loadError')))
      .finally(() => setLoading(false));
  }, [selectedTeamId, accessToken]);

  const handleOpen = (session: PracticeSession) => {
    resetAll();
    restoreFromDraft('cloud-' + session.id, session.practiceInfo, session.drills);
    navigate('/sessions?view=1');
  };

  if (!accessToken) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('sessions.cloudTitle')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('sessions.cloudSubtitle')}
        </p>
      </div>

      {teams.length > 1 && (
        <div className="px-6 py-3 border-b border-border bg-card">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTeamId((id) => id)}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t('sessions.retry')}
            </Button>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && selectedTeamId && (
          <p className="text-center text-muted-foreground py-16 text-sm">
            {t('sessions.noCloudSessions')}
          </p>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {session.practiceInfo.clubName} – {session.practiceInfo.teamName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.practiceInfo.date)}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    {t('sessions.synced')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(session.practiceInfo.totalTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {session.practiceInfo.athletesNumber} {t('sessions.athletesLabel')}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {session.practiceInfo.coachName}
                  </span>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpen(session)}
                    className="text-xs"
                  >
                    {t('sessions.viewResultsLink')}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
