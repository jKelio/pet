import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  RotateCcw,
  Download,
  Loader2,
  Clock,
  Layers,
  TrendingDown,
  Cloud,
} from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { useTrackingStore } from '../tracking/stores/tracking.store.js';
import { completeSession } from '../tracking/hooks/useDraftPersistence.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from '../admin/stores/admin.store.js';
import type { SavedSession } from '../sessions/lib/db.js';
import { syncSession, resolveSyncTeamId } from '../sessions/lib/sessionSync.js';
import {
  extractDrillDurations,
  extractTimelineSegmentsForDrill,
  aggregateTimeByActionForDrill,
  aggregateTimersAcrossDrills,
  aggregateCountersAcrossDrills,
  ACTION_COLORS,
  formatRelativeTime,
} from './lib/ganttUtils.js';
import { ActionTimeline } from './components/ActionTimeline.js';
import { DrillOverviewTimeline } from './components/DrillOverviewTimeline.js';
import { RecommendationPanel } from '../recommendations/components/RecommendationPanel.js';
import { pdfApi } from './api/pdf.api.js';
import { buildPdfReportModel } from './lib/buildPdfReportModel.js';
import { toServerSessionId } from './lib/serverSessionId.js';
import { ApiClientError } from '../../shared/lib/api-client.js';
import { DRILL_COLORS, PASSIVE_TIMER_IDS } from '@pet/shared';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} h`;
  return `${m}:${String(s).padStart(2, '0')} min`;
}

export function ResultsPage() {
  const { t, i18n } = useTranslation('pet');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get('view') === '1';
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Freeze display data on first render so resetting the store doesn't clear the UI
  const [localSessionId] = useState(() => useTrackingStore.getState().sessionId);
  const [localDrills] = useState(() => useTrackingStore.getState().drills);
  const [localPracticeInfo] = useState(() => useTrackingStore.getState().practiceInfo);
  // The id under which the completed session was actually stored (normalized to a UUID).
  const savedIdRef = useRef(localSessionId);

  const resetAllData = useTrackingStore((s) => s.resetAllData);
  const tenantId = useAuthStore((s) => s.tenantId);
  const accessToken = useAuthStore((s) => s.accessToken);

  const teams = useAdminStore((s) => s.teams);
  const sessionTeam = teams.find((tm) => tm.id === localPracticeInfo.teamId);
  const membership = useAdminStore((s) => s.membership);
  const entitlements = useAdminStore((s) => s.entitlements);
  const loadProfile = useAdminStore((s) => s.loadProfile);

  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken && !membership) loadProfile(accessToken);
  }, [accessToken, membership]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildLocalSession = (id: string): SavedSession => ({
    id,
    practiceInfo: localPracticeInfo,
    drills: localDrills,
    completedAt: Date.now(),
    syncedAt: null,
    teamId: null,
    tenantId,
  });

  // Save completed session to the local outbox, clear the store so the auto-save
  // hook on TrackingPage can't recreate a stale draft, then try to sync right away.
  // A failed sync (offline / no team yet) just leaves it pending for later retry.
  // Skipped in view-only mode.
  useEffect(() => {
    if (viewOnly || localDrills.length === 0) return;
    completeSession(localSessionId, localPracticeInfo, localDrills, tenantId)
      .then((savedId) => {
        savedIdRef.current = savedId;
        resetAllData();
        const session = buildLocalSession(savedId);
        const teamId = resolveSyncTeamId(session, useAdminStore.getState().teams);
        if (accessToken && teamId && navigator.onLine) {
          syncSession(session, accessToken, teamId)
            .then(() => setSynced(true))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // In view-only mode (cloud session preview) the store is never reset above,
  // so reset it when the user navigates away to avoid leaking cloud data into
  // the Tracking page and auto-starting the gap timer there.
  useEffect(() => {
    if (!viewOnly) return;
    return () => resetAllData();
  }, [viewOnly, resetAllData]);

  const handleSync = async () => {
    if (!accessToken) return;
    const session = buildLocalSession(savedIdRef.current);
    const teamId = resolveSyncTeamId(session, teams);
    if (!teamId) {
      setSyncError(teams.length === 0 ? t('sessions.noTeamError') : t('sessions.teamAmbiguousHint'));
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      await syncSession(session, accessToken, teamId);
      setSynced(true);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : t('sessions.syncError'));
    } finally {
      setSyncing(false);
    }
  };

  // ── Computed values ───────────────────────────────────────────────────────

  const totalWasteTime =
    localDrills.reduce((sum, d) => sum + (d.wasteTime?.totalTime ?? 0), 0) +
    (localPracticeInfo.wasteTime?.totalTime ?? 0);

  const totalTimerTime = localDrills.reduce(
    (sum, d) => sum + Object.values(d.timerData ?? {}).reduce((s, td) => s + (td.totalTime ?? 0), 0),
    0,
  );
  const totalTime = totalTimerTime + totalWasteTime;

  const totalPassiveTime =
    totalWasteTime +
    localDrills.reduce(
      (sum, d) => sum + PASSIVE_TIMER_IDS.reduce((s, id) => s + (d.timerData?.[id]?.totalTime ?? 0), 0),
      0,
    );
  const passivePercent = totalTime > 0 ? Math.round((totalPassiveTime / totalTime) * 100) : 0;

  const gapSegments = localPracticeInfo.wasteTime?.timeSegments ?? [];
  const trainingStartTime = gapSegments[0]?.startTime;
  const lastGap = gapSegments[gapSegments.length - 1];
  const totalTrainingDuration =
    trainingStartTime && lastGap?.endTime ? lastGap.endTime - trainingStartTime : undefined;

  const drillDurations = extractDrillDurations(localDrills, t, trainingStartTime);

  const drillTimeData = [
    ...drillDurations
      .map((d, i) => ({
        name: `${t('drills.drill')} ${d.drillId}`,
        totalTime: d.duration,
        color: DRILL_COLORS[i % DRILL_COLORS.length],
      }))
      .filter((d) => d.totalTime > 0),
    ...(localPracticeInfo.wasteTime?.totalTime > 0
      ? [
          {
            name: t('timeWatcher.gapTime'),
            totalTime: localPracticeInfo.wasteTime.totalTime,
            color: '#808080',
          },
        ]
      : []),
  ];

  const overallTimers = aggregateTimersAcrossDrills(localDrills, t);
  const overallCounters = aggregateCountersAcrossDrills(localDrills, t);

  // ── PDF export ────────────────────────────────────────────────────────────

  // PDF is rendered server-side (gated + metered per plan). Re-downloading a
  // session already exported this month is free. See ADR 0008/0009.
  const exportToPdf = async () => {
    if (isExporting) return;
    if (!accessToken) {
      setPdfError(t('results.pdfNeedsAccount'));
      return;
    }
    setIsExporting(true);
    setPdfError(null);

    try {
      const model = buildPdfReportModel({
        sessionId: toServerSessionId(savedIdRef.current),
        drills: localDrills,
        practiceInfo: localPracticeInfo,
        t,
        language: i18n.language,
      });
      const blob = await pdfApi.generate(model, accessToken);
      const date = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      // Refresh entitlements so the remaining-export hint updates.
      loadProfile(accessToken);
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === 'QUOTA_EXCEEDED' || err.code === 'UPGRADE_REQUIRED')) {
        setPdfError(t('results.pdfQuotaReached'));
      } else {
        setPdfError(err instanceof Error ? err.message : t('results.exportError'));
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    resetAllData();
    navigate('/');
  };

  const handleBack = () => navigate(-1);

  if (localDrills.length === 0) {
    return <Navigate to="/history" replace />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">{t('results.title')}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPdf} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">
                {isExporting ? t('results.exporting') : t('results.pdfExport')}
                {!isExporting && typeof entitlements?.pdf.remaining === 'number'
                  ? ` (${entitlements.pdf.remaining})`
                  : ''}
              </span>
            </Button>
            {accessToken && !viewOnly && !synced && (
              entitlements?.sync.limit === 0 ? (
                <Button variant="outline" size="sm" disabled title={t('results.syncUpgradeHint')}>
                  <Cloud className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">{t('results.syncUpgrade')}</span>
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">{t('sessions.syncToCloud')}</span>
                </Button>
              )
            )}
            {accessToken && (synced || viewOnly) && (
              <RecommendationPanel
                sessionId={toServerSessionId(savedIdRef.current)}
                accessToken={accessToken}
                disabled={entitlements ? !entitlements.ai.allowed : false}
                disabledReason={entitlements && !entitlements.ai.allowed ? t('results.aiUpgradeHint') : undefined}
              />
            )}
            {accessToken && !synced && !viewOnly && (
              <RecommendationPanel
                sessionId={toServerSessionId(savedIdRef.current)}
                accessToken={accessToken}
                disabled
                disabledReason={t('results.analyseNotSynced')}
              />
            )}
            {viewOnly ? (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{t('results.back')}</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{t('results.newTraining')}</span>
              </Button>
            )}
          </div>
        </div>
        {syncError && (
          <p className="px-6 pb-3 text-xs text-destructive">
            {t('sessions.errorPrefix')}: {syncError}
          </p>
        )}
        {pdfError && (
          <p className="px-6 pb-3 text-xs text-destructive">
            {t('sessions.errorPrefix')}: {pdfError}
          </p>
        )}
      </div>

      {/* Scrollable content — also used as export container */}
      <div ref={exportRef} className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <section className="pdf-section @container">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t('results.summary')}
          </h2>
          <div className="grid grid-cols-2 @sm:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Layers className="h-5 w-5" />}
              label={t('results.drills')}
              value={String(localDrills.length)}
            />
            <SummaryCard
              icon={<Clock className="h-5 w-5" />}
              label={t('results.totalTime')}
              value={formatDuration(totalTime)}
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5" />}
              label={t('results.passiveTime')}
              value={formatDuration(totalPassiveTime)}
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5 text-destructive" />}
              label={t('results.passivePercent')}
              value={`${passivePercent}%`}
              highlight={passivePercent > 40}
            />
          </div>

          {/* Practice info */}
          {localPracticeInfo.clubName && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4 grid grid-cols-2 @sm:grid-cols-3 gap-3 text-sm">
              {localPracticeInfo.clubName && (
                <InfoRow label={t('results.club')} value={localPracticeInfo.clubName} />
              )}
              {localPracticeInfo.teamName && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('results.team')}</p>
                  <div className="flex items-center gap-1.5">
                    {sessionTeam?.ageClass != null && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        U{sessionTeam.ageClass}
                      </span>
                    )}
                    <p className="font-medium">{localPracticeInfo.teamName}</p>
                  </div>
                </div>
              )}
              {localPracticeInfo.coachName && (
                <InfoRow label={t('results.coach')} value={localPracticeInfo.coachName} />
              )}
              {localPracticeInfo.trackedPlayerName && (
                <InfoRow label={t('results.player')} value={localPracticeInfo.trackedPlayerName} />
              )}
              {localPracticeInfo.date && (
                <InfoRow label={t('results.date')} value={new Date(localPracticeInfo.date).toLocaleDateString()} />
              )}
            </div>
          )}
        </section>

        {/* ── Drill overview timeline ───────────────────────────────────── */}
        {drillDurations.length > 0 && (
          <section className="pdf-section space-y-3 @container">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('results.trainingTimeline')}
            </h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <DrillOverviewTimeline
                drillDurations={drillDurations}
                totalDuration={totalTrainingDuration}
              />
            </div>
          </section>
        )}

        {/* ── Zeit pro Drill (Bar chart) ────────────────────────────────── */}
        {drillTimeData.length > 0 && (
          <section className="pdf-section space-y-3 @container">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('results.timePerDrill')}
            </h2>
            <div className="rounded-lg border border-border bg-card p-4 grid @sm:grid-cols-2 gap-6">
              {/* Pie chart */}
              <ResponsiveContainer width="100%" height={Math.max(200, drillTimeData.length * 40 + 60)}>
                <PieChart>
                  <Pie
                    data={drillTimeData}
                    dataKey="totalTime"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                  >
                    {drillTimeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                          <p className="font-medium mb-0.5">{payload[0].name}</p>
                          <p>{t('results.totalTime')}: {formatDuration(payload[0].value as number)}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend formatter={(label) => <span className="text-xs">{label}</span>} />
                </PieChart>
              </ResponsiveContainer>

              {/* Bar chart */}
              <ResponsiveContainer width="100%" height={Math.max(200, drillTimeData.length * 40 + 60)}>
                <BarChart data={drillTimeData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatRelativeTime(v as number)}
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={11}
                    width={70}
                    domain={drillTimeData.map((d) => d.name)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                          <p className="font-medium mb-0.5">{payload[0].payload.name}</p>
                          <p>{t('results.totalTime')}: {formatDuration(payload[0].value as number)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
                    {drillTimeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Aktionen & Zähler über alle Drills ───────────────────────────── */}
        {(overallTimers.length > 0 || overallCounters.length > 0) && (
          <section className="pdf-section space-y-3 @container">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('results.overall')}
            </h2>
            <div className="grid @sm:grid-cols-2 gap-4">
              {overallTimers.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-3">{t('results.stoppedTimes')}</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left pb-2 font-medium">{t('results.action')}</th>
                        <th className="text-right pb-2 font-medium">{t('results.segments')}</th>
                        <th className="text-right pb-2 font-medium">{t('results.total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallTimers.map((row) => (
                        <tr key={row.actionId} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: ACTION_COLORS[row.actionId] ?? '#999' }}
                            />
                            {row.actionLabel}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                            {row.segments}×
                          </td>
                          <td className="py-1.5 text-right tabular-nums font-medium">
                            {formatDuration(row.totalTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {overallCounters.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-3">{t('results.counters')}</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left pb-2 font-medium">{t('results.action')}</th>
                        <th className="text-right pb-2 font-medium">{t('results.count')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallCounters.map((row) => (
                        <tr key={row.actionId} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: ACTION_COLORS[row.actionId] ?? '#999' }}
                            />
                            {row.actionLabel}
                          </td>
                          <td className="py-1.5 text-right tabular-nums font-medium">
                            {row.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Per-drill detail ─────────────────────────────────────────── */}
        {localDrills.map((drill) => {
          const actionData = aggregateTimeByActionForDrill(drill, t);
          const { segments: dSegs, counterEvents: dCtrEvents, actionLabels: dLabels } =
            extractTimelineSegmentsForDrill(drill, t);
          const hasData = actionData.length > 0 || dSegs.length > 0 || dCtrEvents.length > 0;
          if (!hasData) return null;

          const counterData = Object.entries(drill.counterData ?? {}).filter(([, cd]) => cd.count > 0);
          const timerData = Object.entries(drill.timerData ?? {}).filter(([, td]) => td.totalTime > 0);

          return (
            <section key={drill.id} className="pdf-section space-y-4 @container">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                {t('drills.drill')} {drill.id}
                {(drill.tags as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary normal-case tracking-normal"
                  >
                    {t(`drills.${tag}`)}
                  </span>
                ))}
              </h2>

              {/* Gantt timeline */}
              {dSegs.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <ActionTimeline
                    segments={dSegs}
                    counterEvents={dCtrEvents}
                    actionLabels={dLabels}
                  />
                </div>
              )}

              {/* Pie + Bar charts */}
              {actionData.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 grid @sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('results.timePerAction')}</p>
                    <ResponsiveContainer width="100%" height={Math.max(200, actionData.length * 28 + 100)}>
                      <PieChart>
                        <Pie
                          data={actionData}
                          dataKey="totalTime"
                          nameKey="actionLabel"
                          cx="50%"
                          cy="45%"
                          outerRadius={70}
                        >
                          {actionData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={ACTION_COLORS[entry.actionId] ?? DRILL_COLORS[i % DRILL_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                                <p className="font-medium mb-0.5">{payload[0].name}</p>
                                <p>{t('results.totalTime')}: {formatDuration(payload[0].value as number)}</p>
                              </div>
                            );
                          }}
                        />
                        <Legend formatter={(label) => <span className="text-xs">{label}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('results.timePerAction')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={actionData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis
                          type="number"
                          tickFormatter={(v) => formatRelativeTime(v as number)}
                          fontSize={10}
                        />
                        <YAxis type="category" dataKey="actionLabel" fontSize={10} width={90} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                                <p className="font-medium mb-0.5">{payload[0].payload.actionLabel}</p>
                                <p>{t('results.totalTime')}: {formatDuration(payload[0].value as number)}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
                          {actionData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={ACTION_COLORS[entry.actionId] ?? DRILL_COLORS[i % DRILL_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Timer + Counter tables */}
              {(timerData.length > 0 || counterData.length > 0) && (
                <div className="grid @sm:grid-cols-2 gap-4">
                  {timerData.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground mb-3">{t('results.stoppedTimes')}</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs text-muted-foreground">
                            <th className="text-left pb-2 font-medium">{t('results.action')}</th>
                            <th className="text-right pb-2 font-medium">{t('results.segments')}</th>
                            <th className="text-right pb-2 font-medium">{t('results.total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timerData.map(([actionId, td]) => (
                            <tr key={actionId} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5 flex items-center gap-2">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: ACTION_COLORS[actionId] ?? '#999' }}
                                />
                                {t(`actions.${actionId}`, { defaultValue: actionId })}
                              </td>
                              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                {td.timeSegments?.length ?? 0}×
                              </td>
                              <td className="py-1.5 text-right tabular-nums font-medium">
                                {formatDuration(td.totalTime)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {counterData.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground mb-3">{t('results.counters')}</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs text-muted-foreground">
                            <th className="text-left pb-2 font-medium">{t('results.action')}</th>
                            <th className="text-right pb-2 font-medium">{t('results.count')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {counterData.map(([actionId, cd]) => (
                            <tr key={actionId} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5 flex items-center gap-2">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: ACTION_COLORS[actionId] ?? '#999' }}
                                />
                                {t(`actions.${actionId}`, { defaultValue: actionId })}
                              </td>
                              <td className="py-1.5 text-right tabular-nums font-medium">
                                {cd.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}`}
    >
      <div className={`mb-1 ${highlight ? 'text-destructive' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${highlight ? 'text-destructive' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
