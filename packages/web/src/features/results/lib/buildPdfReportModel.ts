import type { TFunction } from 'i18next';
import type { Drill, PracticeInfo, PdfReportModel } from '@pet/shared';
import { ACTION_COLORS, DRILL_COLORS } from '@pet/shared';
import {
  aggregateTimersAcrossDrills,
  aggregateCountersAcrossDrills,
  aggregateTimeByActionForDrill,
  extractDrillDurations,
  extractTimelineSegmentsForDrill,
} from './ganttUtils.js';

const SUPPORTED_LOCALES = ['en', 'de', 'ru'] as const;

function resolveLocale(language: string): PdfReportModel['locale'] {
  const base = language.split('-')[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as PdfReportModel['locale'])
    : 'en';
}

/**
 * Builds the server PDF "report model" from the live session data, reusing the
 * same aggregation the on-screen Results view uses. The server renders this
 * statelessly — see docs/adr/0009-server-side-pdf-report.md. The chart-ready
 * fields mirror the Results-page charts; colors are resolved here so the server
 * stays "dumb".
 */
export function buildPdfReportModel(params: {
  sessionId: string;
  drills: Drill[];
  practiceInfo: PracticeInfo;
  t: TFunction;
  language: string;
}): PdfReportModel {
  const { sessionId, drills, practiceInfo, t, language } = params;

  const totalWasteTime =
    drills.reduce((sum, d) => sum + (d.wasteTime?.totalTime ?? 0), 0) +
    (practiceInfo.wasteTime?.totalTime ?? 0);
  const totalTimerTime = drills.reduce(
    (sum, d) => sum + Object.values(d.timerData ?? {}).reduce((s, td) => s + (td.totalTime ?? 0), 0),
    0,
  );
  const totalTime = totalTimerTime + totalWasteTime;
  const wastePercent = totalTime > 0 ? Math.round((totalWasteTime / totalTime) * 100) : 0;

  const overallTimers = aggregateTimersAcrossDrills(drills, t).map((r) => ({
    label: r.actionLabel,
    segments: r.segments,
    totalTime: r.totalTime,
  }));
  const overallCounters = aggregateCountersAcrossDrills(drills, t).map((r) => ({
    label: r.actionLabel,
    count: r.count,
  }));

  // ── Chart data (mirrors ResultsPage) ──────────────────────────────────────
  const gapSegments = practiceInfo.wasteTime?.timeSegments ?? [];
  const trainingStartTime = gapSegments[0]?.startTime;
  const lastGap = gapSegments[gapSegments.length - 1];
  const totalTrainingDuration =
    trainingStartTime && lastGap?.endTime ? lastGap.endTime - trainingStartTime : undefined;

  const drillDurations = extractDrillDurations(drills, t, trainingStartTime);

  // "Zeit pro Drill" pie + bar: one slice per drill (+ gap slice). Same color
  // assignment as ResultsPage (DRILL_COLORS by index, gap = grey).
  const drillTimeData = [
    ...drillDurations
      .map((d, i) => ({
        name: `${t('drills.drill')} ${d.drillId}`,
        totalTime: d.duration,
        color: DRILL_COLORS[i % DRILL_COLORS.length],
      }))
      .filter((d) => d.totalTime > 0),
    ...((practiceInfo.wasteTime?.totalTime ?? 0) > 0
      ? [{ name: t('timeWatcher.gapTime'), totalTime: practiceInfo.wasteTime.totalTime, color: '#808080' }]
      : []),
  ];

  // Drill-overview Gantt: when each drill ran across the session.
  const drillOverview = {
    totalDuration: totalTrainingDuration,
    drills: drillDurations.map((d, i) => ({
      drillNumber: d.drillId,
      label: d.drillLabel,
      startOffset: d.startOffset,
      endOffset: d.endOffset,
      duration: d.duration,
      color: DRILL_COLORS[i % DRILL_COLORS.length],
    })),
  };

  const drillSections = drills
    .map((drill) => {
      const timeByAction = aggregateTimeByActionForDrill(drill, t).map((a, i) => ({
        label: a.actionLabel,
        totalTime: a.totalTime,
        color: ACTION_COLORS[a.actionId] ?? DRILL_COLORS[i % DRILL_COLORS.length],
      }));

      const { segments, counterEvents, actionLabels } = extractTimelineSegmentsForDrill(drill, t);
      const timelineMax = Math.max(
        0,
        ...segments.map((s) => s.endOffset),
        ...counterEvents.map((e) => e.timestamp),
      );
      const timeline = {
        totalDuration: timelineMax,
        segments: segments.map((s) => ({
          label: s.actionLabel,
          startOffset: s.startOffset,
          endOffset: s.endOffset,
          color: ACTION_COLORS[s.actionId] ?? '#999999',
        })),
        counterEvents: counterEvents.map((e) => ({
          label: e.actionLabel,
          timestamp: e.timestamp,
          color: ACTION_COLORS[e.actionId] ?? '#999999',
        })),
        actionLabels: actionLabels.map((a) => ({
          label: a.actionLabel,
          color: ACTION_COLORS[a.actionId] ?? '#999999',
        })),
      };

      return {
        drillNumber: drill.id,
        tags: (drill.tags as string[]).map((tag) => t(`drills.${tag}`)),
        timers: Object.entries(drill.timerData ?? {})
          .filter(([, td]) => (td.totalTime ?? 0) > 0)
          .map(([actionId, td]) => ({
            label: t(`actions.${actionId}`, { defaultValue: actionId }),
            segments: td.timeSegments?.length ?? 0,
            totalTime: td.totalTime ?? 0,
          })),
        counters: Object.entries(drill.counterData ?? {})
          .filter(([, cd]) => (cd.count ?? 0) > 0)
          .map(([actionId, cd]) => ({
            label: t(`actions.${actionId}`, { defaultValue: actionId }),
            count: cd.count ?? 0,
          })),
        timeByAction,
        timeline,
      };
    })
    .filter(
      (d) =>
        d.timers.length > 0 ||
        d.counters.length > 0 ||
        d.timeline.segments.length > 0 ||
        d.timeline.counterEvents.length > 0,
    );

  return {
    sessionId,
    locale: resolveLocale(language),
    generatedAt: new Date().toISOString(),
    info: {
      clubName: practiceInfo.clubName || undefined,
      teamName: practiceInfo.teamName || undefined,
      coachName: practiceInfo.coachName || undefined,
      trackedPlayerName: practiceInfo.trackedPlayerName || undefined,
      date: practiceInfo.date ? new Date(practiceInfo.date).toLocaleDateString() : undefined,
    },
    summary: {
      drills: drills.length,
      totalTime,
      wasteTime: totalWasteTime,
      wastePercent,
    },
    overallTimers,
    overallCounters,
    drills: drillSections,
    drillTimeData,
    drillOverview,
  };
}
