import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { domToPng } from 'modern-screenshot';
import jsPDF from 'jspdf';
import {
  ArrowLeft,
  RotateCcw,
  Download,
  Loader2,
  Clock,
  Layers,
  TrendingDown,
} from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { useTrackingStore } from '../tracking/stores/tracking.store.js';
import { completeSession } from '../tracking/hooks/useDraftPersistence.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
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

const DRILL_COLORS = [
  '#0088FE', '#FF8042', '#00C49F', '#FFBB28', '#A28BFE',
  '#FF6699', '#33CC99', '#FF6666', '#66B3FF', '#FFCC99',
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} h`;
  return `${m}:${String(s).padStart(2, '0')} min`;
}

export function ResultsPage() {
  const { t } = useTranslation('pet');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get('view') === '1';
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  const sessionId = useTrackingStore((s) => s.sessionId);
  const drills = useTrackingStore((s) => s.drills);
  const practiceInfo = useTrackingStore((s) => s.practiceInfo);
  const resetAllData = useTrackingStore((s) => s.resetAllData);
  const tenantId = useAuthStore((s) => s.tenantId);

  // Save completed session to IndexedDB — skipped in view-only mode (cloud sessions)
  useEffect(() => {
    if (!viewOnly && drills.length > 0) {
      completeSession(sessionId, practiceInfo, drills, tenantId).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values ───────────────────────────────────────────────────────

  const totalWasteTime =
    drills.reduce((sum, d) => sum + (d.wasteTime?.totalTime ?? 0), 0) +
    (practiceInfo.wasteTime?.totalTime ?? 0);

  const totalTimerTime = drills.reduce(
    (sum, d) => sum + Object.values(d.timerData ?? {}).reduce((s, td) => s + (td.totalTime ?? 0), 0),
    0,
  );
  const totalTime = totalTimerTime + totalWasteTime;
  const wastePercent = totalTime > 0 ? Math.round((totalWasteTime / totalTime) * 100) : 0;

  const gapSegments = practiceInfo.wasteTime?.timeSegments ?? [];
  const trainingStartTime = gapSegments[0]?.startTime;
  const lastGap = gapSegments[gapSegments.length - 1];
  const totalTrainingDuration =
    trainingStartTime && lastGap?.endTime ? lastGap.endTime - trainingStartTime : undefined;

  const drillDurations = extractDrillDurations(drills, t, trainingStartTime);

  // Derived from the same wall-clock span as the "Trainings-Zeitleiste" so both
  // charts always agree on a drill's duration.
  const drillTimeData = [
    ...drillDurations
      .map((d, i) => ({
        name: `${t('drills.drill')} ${d.drillId}`,
        totalTime: d.duration,
        color: DRILL_COLORS[i % DRILL_COLORS.length],
      }))
      .filter((d) => d.totalTime > 0),
    ...(practiceInfo.wasteTime?.totalTime > 0
      ? [
          {
            name: t('timeWatcher.gapTime'),
            totalTime: practiceInfo.wasteTime.totalTime,
            color: '#808080',
          },
        ]
      : []),
  ];

  // Session-wide aggregation across every drill (mirrors the per-drill tables).
  const overallTimers = aggregateTimersAcrossDrills(drills, t);
  const overallCounters = aggregateCountersAcrossDrills(drills, t);

  // ── PDF export ────────────────────────────────────────────────────────────

  const exportToPdf = async () => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const container = exportRef.current;
      const savedStyle = container.getAttribute('style') ?? '';
      container.style.cssText =
        'position:fixed;left:0;top:0;z-index:-9999;opacity:1;width:800px;overflow:visible';

      await new Promise((r) => setTimeout(r, 300));

      const sections = container.querySelectorAll<HTMLElement>('.pdf-section');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableW = pdfW - 2 * margin;
      const usableH = pdf.internal.pageSize.getHeight() - 2 * margin;
      let currentY = 0;
      let first = true;

      for (let i = 0; i < sections.length; i++) {
        setExportStatus(t('results.exportSection', { current: i + 1, total: sections.length }));
        try {
          const dataUrl = await domToPng(sections[i], {
            scale: 2,
            quality: 0.92,
            backgroundColor: '#ffffff',
          });
          const img = new Image();
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
            img.src = dataUrl;
          });
          const scaledH = (img.height * usableW) / img.width;
          if (!first && currentY + scaledH > usableH) {
            pdf.addPage();
            currentY = 0;
          }
          pdf.addImage(dataUrl, 'PNG', margin, margin + currentY, usableW, scaledH);
          currentY += scaledH + 5;
          first = false;
        } catch {
          // Skip failed section
        }
      }

      container.setAttribute('style', savedStyle);

      const date = new Date().toISOString().split('T')[0];
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const handleReset = () => {
    resetAllData();
    navigate('/');
  };

  const handleBack = () => navigate(-1);

  if (drills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <p className="text-muted-foreground">{t('results.noData')}</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('results.newTraining')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card gap-3 flex-wrap">
        <h1 className="text-xl font-bold">{t('results.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPdf} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">
              {isExporting ? exportStatus || t('results.exporting') : t('results.pdfExport')}
            </span>
          </Button>
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

      {/* Scrollable content — also used as export container */}
      <div ref={exportRef} className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <section className="pdf-section">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t('results.summary')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Layers className="h-5 w-5" />}
              label={t('results.drills')}
              value={String(drills.length)}
            />
            <SummaryCard
              icon={<Clock className="h-5 w-5" />}
              label={t('results.totalTime')}
              value={formatDuration(totalTime)}
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5" />}
              label={t('results.wasteTime')}
              value={formatDuration(totalWasteTime)}
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5 text-destructive" />}
              label={t('results.wastePercent')}
              value={`${wastePercent}%`}
              highlight={wastePercent > 30}
            />
          </div>

          {/* Practice info */}
          {practiceInfo.clubName && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {practiceInfo.clubName && (
                <InfoRow label={t('results.club')} value={practiceInfo.clubName} />
              )}
              {practiceInfo.teamName && (
                <InfoRow label={t('results.team')} value={practiceInfo.teamName} />
              )}
              {practiceInfo.coachName && (
                <InfoRow label={t('results.coach')} value={practiceInfo.coachName} />
              )}
              {practiceInfo.trackedPlayerName && (
                <InfoRow label={t('results.player')} value={practiceInfo.trackedPlayerName} />
              )}
              {practiceInfo.date && (
                <InfoRow label={t('results.date')} value={new Date(practiceInfo.date).toLocaleDateString()} />
              )}
            </div>
          )}
        </section>

        {/* ── Drill overview timeline ───────────────────────────────────── */}
        {drillDurations.length > 0 && (
          <section className="pdf-section space-y-3">
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
          <section className="pdf-section space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('results.timePerDrill')}
            </h2>
            <div className="rounded-lg border border-border bg-card p-4 grid sm:grid-cols-2 gap-6">
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
                  <Tooltip formatter={(v) => formatDuration(v as number)} />
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
                  <YAxis type="category" dataKey="name" fontSize={11} width={70} />
                  <Tooltip formatter={(v) => formatDuration(v as number)} />
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
          <section className="pdf-section space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('results.overall')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Gestoppte Zeiten (gesamt) */}
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

              {/* Zähler (gesamt) */}
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
        {drills.map((drill) => {
          const actionData = aggregateTimeByActionForDrill(drill, t);
          const { segments: dSegs, counterEvents: dCtrEvents, actionLabels: dLabels } =
            extractTimelineSegmentsForDrill(drill, t);
          const hasData = actionData.length > 0 || dSegs.length > 0 || dCtrEvents.length > 0;
          if (!hasData) return null;

          const counterData = Object.entries(drill.counterData ?? {}).filter(([, cd]) => cd.count > 0);
          const timerData = Object.entries(drill.timerData ?? {}).filter(([, td]) => td.totalTime > 0);

          return (
            <section key={drill.id} className="pdf-section space-y-4">
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
                <div className="rounded-lg border border-border bg-card p-4 grid sm:grid-cols-2 gap-6">
                  {/* Pie chart */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('results.timePerAction')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={actionData}
                          dataKey="totalTime"
                          nameKey="actionLabel"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                        >
                          {actionData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={ACTION_COLORS[entry.actionId] ?? DRILL_COLORS[i % DRILL_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatDuration(v as number)} />
                        <Legend formatter={(label) => <span className="text-xs">{label}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar chart */}
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
                        <Tooltip formatter={(v) => formatDuration(v as number)} />
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
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Gestoppte Zeiten */}
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

                  {/* Zähler */}
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
