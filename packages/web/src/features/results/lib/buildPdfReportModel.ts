import type { TFunction } from 'i18next';
import type { Drill, PracticeInfo, PdfReportModel } from '@pet/shared';
import { aggregateTimersAcrossDrills, aggregateCountersAcrossDrills } from './ganttUtils.js';

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
 * statelessly — see docs/adr/0009-server-side-pdf-report.md.
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

  const drillSections = drills
    .map((drill) => ({
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
    }))
    .filter((d) => d.timers.length > 0 || d.counters.length > 0);

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
  };
}
