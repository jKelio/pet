import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { History, Clock, Users, User, ChevronDown, ChevronRight, Loader2, RefreshCw, Layers, UploadCloud, Trash2, HardDrive } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from '../admin/stores/admin.store.js';
import { useTrackingStore } from '../tracking/stores/tracking.store.js';
import { useTimerStore } from '../tracking/stores/timer.store.js';
import { useLocalSessionsStore } from './stores/localSessions.store.js';
import { sessionApi } from './api/session.api.js';
import { resolveSyncTeamId } from './lib/sessionSync.js';
import type { SavedSession } from './lib/db.js';
import i18n from '../../lib/i18n.js';
import type { PracticeSession } from '@pet/shared';
import { getEffectiveDurationMs } from '@pet/shared';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}


function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

const PAGE_SIZE = 20;

export function HistoryPage() {
  const { t } = useTranslation('pet');
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const teams = useAdminStore((s) => s.teams);
  const membership = useAdminStore((s) => s.membership);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Bumped on every fresh first-page load so stale responses (team switched
  // mid-request) can't overwrite or append to the current list.
  const listVersion = useRef(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const restoreFromDraft = useTrackingStore((s) => s.restoreFromDraft);
  const resetAll = useTimerStore((s) => s.resetAll);

  const pending = useLocalSessionsStore((s) => s.pending);
  const syncingIds = useLocalSessionsStore((s) => s.syncingIds);
  const syncErrors = useLocalSessionsStore((s) => s.errors);
  const loadPending = useLocalSessionsStore((s) => s.loadPending);
  const syncOne = useLocalSessionsStore((s) => s.syncOne);
  const deleteOne = useLocalSessionsStore((s) => s.deleteOne);
  const clearLocalOnly = useLocalSessionsStore((s) => s.clearLocalOnly);
  // Per-session team choice for ambiguous pending sessions (coach has multiple teams).
  const [teamPicks, setTeamPicks] = useState<Record<string, string>>({});

  const outbox = pending.filter((s) => !s.localOnly);
  const localOnlySessions = pending.filter((s) => s.localOnly);

  // Load the local pending-sync outbox on mount
  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const resolveAgeClass = (pi: { teamId?: string; teamName: string }) =>
    (teams.find((tm) => tm.id === pi.teamId) ?? teams.find((tm) => tm.kind === 'own' && tm.name === pi.teamName))?.ageClass ?? null;

  const SessionLabel = ({ pi }: { pi: { clubName: string; teamId?: string; teamName: string } }) => {
    const ac = resolveAgeClass(pi);
    return (
      <span className="flex items-center gap-1.5 flex-wrap">
        <span>{pi.clubName} –</span>
        {ac != null && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            U{ac}
          </span>
        )}
        <span>{pi.teamName}</span>
      </span>
    );
  };

  const teamLabel = (tm: { ageClass: number | null; name: string }) =>
    tm.ageClass != null ? `U${tm.ageClass} — ${tm.name}` : tm.name;

  const ownTeams = teams.filter((t) => t.kind === 'own');
  const externalTeams = teams.filter((t) => t.kind === 'external');
  const externalClubs = [...new Set(externalTeams.map((t) => t.externalClubName).filter(Boolean) as string[])];

  const visibleTeams = selectedClub
    ? externalTeams.filter((t) => t.externalClubName === selectedClub)
    : ownTeams;

  // Pre-select first visible team
  useEffect(() => {
    if (visibleTeams.length > 0 && !visibleTeams.find((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(visibleTeams[0].id);
    }
  }, [visibleTeams, selectedTeamId]);

  const loadFirstPage = useCallback(() => {
    if (!selectedTeamId || !accessToken) return;
    const version = ++listVersion.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    sessionApi
      .listByTeam(selectedTeamId, accessToken, { limit: PAGE_SIZE })
      .then((page) => {
        if (listVersion.current !== version) return;
        setSessions(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (listVersion.current === version) setError(t('sessions.loadError'));
      })
      .finally(() => {
        if (listVersion.current === version) setLoading(false);
      });
  }, [selectedTeamId, accessToken, t]);

  // Load the first page when the team changes
  useEffect(() => {
    setSessions([]);
    setNextCursor(null);
    loadFirstPage();
  }, [loadFirstPage]);

  const handleLoadMore = () => {
    if (!nextCursor || !selectedTeamId || !accessToken || loadingMore) return;
    const version = listVersion.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    sessionApi
      .listByTeam(selectedTeamId, accessToken, { limit: PAGE_SIZE, cursor: nextCursor })
      .then((page) => {
        if (listVersion.current !== version) return;
        setSessions((prev) => [...prev, ...page.items]);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (listVersion.current === version) setLoadMoreError(t('sessions.loadMoreError'));
      })
      .finally(() => {
        if (listVersion.current === version) setLoadingMore(false);
      });
  };

  const handleOpen = (session: PracticeSession) => {
    resetAll();
    restoreFromDraft('cloud-' + session.id, session.practiceInfo, session.drills);
    navigate('/sessions?view=1');
  };

  const handleOpenLocal = (session: SavedSession) => {
    resetAll();
    restoreFromDraft('local-' + session.id, session.practiceInfo, session.drills);
    navigate('/sessions?view=1');
  };

  const handleSyncLocal = (session: SavedSession) => {
    const teamId = teamPicks[session.id] || resolveSyncTeamId(session, teams) || '';
    if (!accessToken || !teamId) return;
    void syncOne(session.id, accessToken, teamId);
  };

  const handleDeleteLocal = (id: string) => {
    if (!confirm(t('sessions.confirmDeleteLocal'))) return;
    void deleteOne(id);
  };

  const canDeleteCloud = (session: PracticeSession) =>
    membership?.role === 'admin' || session.createdBy === membership?.userId;

  const handleDeleteCloud = async (session: PracticeSession) => {
    if (!accessToken || !confirm(t('sessions.confirmDeleteCloud'))) return;
    setDeletingId(session.id);
    setActionError(null);
    try {
      await sessionApi.remove(session.id, accessToken);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch {
      setActionError(t('sessions.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  if (!accessToken) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('sessions.historyTitle')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('sessions.historySubtitle')}
        </p>
      </div>

      {(teams.length > 1 || externalClubs.length > 0) && (
        <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap gap-2">
          {externalClubs.length > 0 && (
            <select
              value={selectedClub}
              onChange={(e) => { setSelectedClub(e.target.value); setSelectedTeamId(''); }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{t('sessions.ownTeamsFilter')}</option>
              {externalClubs.map((club) => (
                <option key={club} value={club}>{club}</option>
              ))}
            </select>
          )}
          {visibleTeams.length > 1 && (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {visibleTeams.map((t) => (
                <option key={t.id} value={t.id}>{teamLabel(t)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {/* Local pending-sync outbox */}
        {outbox.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t('sessions.pendingTitle')}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                {outbox.length}
              </span>
            </div>
            {outbox.map((session) => {
              const isSyncing = syncingIds.includes(session.id);
              const err = syncErrors[session.id];
              const resolvedTeamId = teamPicks[session.id] || resolveSyncTeamId(session, teams) || '';
              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm"><SessionLabel pi={session.practiceInfo} /></p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.practiceInfo.date)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 shrink-0">
                      {t('sessions.pendingBadge')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {session.drills.length} {t('results.drills')}
                    </span>
                    {session.practiceInfo.coachName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {session.practiceInfo.coachName}
                      </span>
                    )}
                  </div>

                  {err && <p className="text-xs text-destructive">{err}</p>}

                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {teams.length > 1 && (
                      <select
                        value={resolvedTeamId}
                        onChange={(e) =>
                          setTeamPicks((p) => ({ ...p, [session.id]: e.target.value }))
                        }
                        className="mr-auto flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">{t('sessions.chooseTeam')}</option>
                        {teams.map((tm) => (
                          <option key={tm.id} value={tm.id}>
                            {tm.externalClubName ? `${tm.externalClubName} – ${teamLabel(tm)}` : teamLabel(tm)}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenLocal(session)}
                      className="text-xs"
                    >
                      {t('sessions.viewResultsLink')}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncLocal(session)}
                      disabled={isSyncing || !resolvedTeamId}
                      className="text-xs"
                    >
                      {isSyncing ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="mr-1 h-3.5 w-3.5" />
                      )}
                      {t('sessions.syncNow')}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteLocal(session.id)}
                      title={t('sessions.deleteAction')}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Local-only (foreign / scouting) sessions — never synced */}
        {localOnlySessions.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t('sessions.localTitle')}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {localOnlySessions.length}
              </span>
            </div>
            {localOnlySessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm"><SessionLabel pi={session.practiceInfo} /></p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.practiceInfo.date)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    <HardDrive className="h-3 w-3" />
                    {t('sessions.localBadge')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {session.drills.length} {t('results.drills')}
                  </span>
                  {session.practiceInfo.coachName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {session.practiceInfo.coachName}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenLocal(session)}
                    className="text-xs"
                  >
                    {t('sessions.viewResultsLink')}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearLocalOnly(session.id)}
                    className="text-xs"
                  >
                    <UploadCloud className="mr-1 h-3.5 w-3.5" />
                    {t('sessions.syncAnyway')}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteLocal(session.id)}
                    title={t('sessions.deleteAction')}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {actionError && (
          <p className="mb-3 text-xs text-destructive">{actionError}</p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadFirstPage}>
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
                    <p className="font-semibold text-sm"><SessionLabel pi={session.practiceInfo} /></p>
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
                    {formatDuration(getEffectiveDurationMs(session))}
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

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpen(session)}
                    className="text-xs"
                  >
                    {t('sessions.viewResultsLink')}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  {canDeleteCloud(session) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteCloud(session)}
                      disabled={deletingId === session.id}
                      title={t('sessions.deleteAction')}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {nextCursor && (
              <div className="flex flex-col items-center gap-2 pt-2 pb-4">
                {loadMoreError && (
                  <p className="text-xs text-destructive">{loadMoreError}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="mr-1.5 h-4 w-4" />
                  )}
                  {t('sessions.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
