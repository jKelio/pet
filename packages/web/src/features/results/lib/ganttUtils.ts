import type { TFunction } from 'i18next';
import type { Drill } from '@pet/shared';
import { ACTION_COLORS as SHARED_COLORS } from '@pet/shared';

export const ACTION_COLORS: Record<string, string> = SHARED_COLORS;

export interface GanttSegment {
  drillId: number;
  drillLabel: string;
  actionId: string;
  actionLabel: string;
  startOffset: number;
  endOffset: number;
  duration: number;
  color: string;
}

export interface CounterEvent {
  actionId: string;
  actionLabel: string;
  timestamp: number;
  drillId: number;
}

export interface DrillBoundary {
  drillId: number;
  drillLabel: string;
  startOffset: number;
}

export interface DrillDuration {
  drillId: number;
  drillLabel: string;
  startOffset: number;
  endOffset: number;
  duration: number;
  tags: string[];
}

export function formatRelativeTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function extractDrillDurations(
  drills: Drill[],
  t: TFunction,
  trainingStartTime?: number,
): DrillDuration[] {
  const drillTimes: Array<{
    drillId: number;
    startTime: number;
    endTime: number;
    tags: string[];
  }> = [];

  drills.forEach((drill) => {
    let earliestTime = Infinity;
    let latestTime = -Infinity;

    Object.values(drill.timerData ?? {}).forEach((td) => {
      td.timeSegments?.forEach((seg) => {
        if (seg.startTime && seg.startTime < earliestTime) earliestTime = seg.startTime;
        if (seg.endTime && seg.endTime > latestTime) latestTime = seg.endTime;
      });
    });

    Object.values(drill.counterData ?? {}).forEach((cd) => {
      cd.timestamps?.forEach((ts) => {
        if (ts < earliestTime) earliestTime = ts;
        if (ts > latestTime) latestTime = ts;
      });
    });

    if (earliestTime !== Infinity && latestTime !== -Infinity) {
      drillTimes.push({
        drillId: drill.id,
        startTime: earliestTime,
        endTime: latestTime,
        tags: drill.tags as string[],
      });
    }
  });

  if (drillTimes.length === 0) return [];

  const minStartTime = trainingStartTime ?? Math.min(...drillTimes.map((d) => d.startTime));

  return drillTimes
    .map((d) => ({
      drillId: d.drillId,
      drillLabel: `${t('results.drill', { defaultValue: 'Drill' })} ${d.drillId}`,
      startOffset: d.startTime - minStartTime,
      endOffset: d.endTime - minStartTime,
      duration: d.endTime - d.startTime,
      tags: d.tags,
    }))
    .sort((a, b) => a.startOffset - b.startOffset);
}

export function extractTimelineSegments(
  drills: Drill[],
  t: TFunction,
): {
  segments: Array<{
    actionId: string;
    actionLabel: string;
    startOffset: number;
    endOffset: number;
    duration: number;
  }>;
  counterEvents: CounterEvent[];
  drillBoundaries: DrillBoundary[];
  actionLabels: Array<{ actionId: string; actionLabel: string }>;
} {
  const rawSegments: Array<{
    actionId: string;
    startTime: number;
    endTime: number;
    duration: number;
  }> = [];

  const rawCounterEvents: Array<{
    actionId: string;
    timestamp: number;
    drillId: number;
  }> = [];

  drills.forEach((drill) => {
    Object.entries(drill.timerData ?? {}).forEach(([actionId, td]) => {
      td.timeSegments?.forEach((seg) => {
        if (seg.startTime && seg.endTime) {
          rawSegments.push({
            actionId,
            startTime: seg.startTime,
            endTime: seg.endTime,
            duration: seg.duration,
          });
        }
      });
    });

    Object.entries(drill.counterData ?? {}).forEach(([actionId, cd]) => {
      cd.timestamps?.forEach((ts) => {
        rawCounterEvents.push({ actionId, timestamp: ts, drillId: drill.id });
      });
    });
  });

  const allTimestamps = [
    ...rawSegments.map((s) => s.startTime),
    ...rawSegments.map((s) => s.endTime),
    ...rawCounterEvents.map((e) => e.timestamp),
  ];

  if (allTimestamps.length === 0) {
    return { segments: [], counterEvents: [], drillBoundaries: [], actionLabels: [] };
  }

  const minStartTime = Math.min(...allTimestamps);

  const segments = rawSegments.map((seg) => ({
    actionId: seg.actionId,
    actionLabel: t(`actions.${seg.actionId}`, { defaultValue: seg.actionId }),
    startOffset: seg.startTime - minStartTime,
    endOffset: seg.endTime - minStartTime,
    duration: seg.duration,
  }));

  const counterEvents: CounterEvent[] = rawCounterEvents.map((evt) => ({
    actionId: evt.actionId,
    actionLabel: t(`actions.${evt.actionId}`, { defaultValue: evt.actionId }),
    timestamp: evt.timestamp - minStartTime,
    drillId: evt.drillId,
  }));

  // Drill boundaries
  const drillStartMap = new Map<number, number>();
  drills.forEach((drill) => {
    let earliest = Infinity;
    Object.values(drill.timerData ?? {}).forEach((td) => {
      td.timeSegments?.forEach((seg) => {
        if (seg.startTime && seg.startTime < earliest) earliest = seg.startTime;
      });
    });
    Object.values(drill.counterData ?? {}).forEach((cd) => {
      cd.timestamps?.forEach((ts) => {
        if (ts < earliest) earliest = ts;
      });
    });
    if (earliest !== Infinity) drillStartMap.set(drill.id, earliest);
  });

  const drillBoundaries: DrillBoundary[] = Array.from(drillStartMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([drillId, startTime]) => ({
      drillId,
      drillLabel: `${t('results.drill', { defaultValue: 'Drill' })} ${drillId}`,
      startOffset: startTime - minStartTime,
    }));

  const seenActions = new Set<string>();
  const actionLabels: Array<{ actionId: string; actionLabel: string }> = [];

  segments.forEach((seg) => {
    if (!seenActions.has(seg.actionId)) {
      seenActions.add(seg.actionId);
      actionLabels.push({ actionId: seg.actionId, actionLabel: seg.actionLabel });
    }
  });
  counterEvents.forEach((evt) => {
    if (!seenActions.has(evt.actionId)) {
      seenActions.add(evt.actionId);
      actionLabels.push({ actionId: evt.actionId, actionLabel: evt.actionLabel });
    }
  });

  return { segments, counterEvents, drillBoundaries, actionLabels };
}

export function extractTimelineSegmentsForDrill(
  drill: Drill,
  t: TFunction,
): {
  segments: Array<{
    actionId: string;
    actionLabel: string;
    startOffset: number;
    endOffset: number;
    duration: number;
  }>;
  counterEvents: CounterEvent[];
  actionLabels: Array<{ actionId: string; actionLabel: string }>;
} {
  const rawSegments: Array<{
    actionId: string;
    startTime: number;
    endTime: number;
    duration: number;
  }> = [];

  const rawCounterEvents: Array<{ actionId: string; timestamp: number }> = [];

  Object.entries(drill.timerData ?? {}).forEach(([actionId, td]) => {
    td.timeSegments?.forEach((seg) => {
      if (seg.startTime && seg.endTime) {
        rawSegments.push({
          actionId,
          startTime: seg.startTime,
          endTime: seg.endTime,
          duration: seg.duration,
        });
      }
    });
  });

  Object.entries(drill.counterData ?? {}).forEach(([actionId, cd]) => {
    cd.timestamps?.forEach((ts) => {
      rawCounterEvents.push({ actionId, timestamp: ts });
    });
  });

  const allTimestamps = [
    ...rawSegments.map((s) => s.startTime),
    ...rawSegments.map((s) => s.endTime),
    ...rawCounterEvents.map((e) => e.timestamp),
  ];

  if (allTimestamps.length === 0) {
    return { segments: [], counterEvents: [], actionLabels: [] };
  }

  const minStartTime = Math.min(...allTimestamps);

  const segments = rawSegments.map((seg) => ({
    actionId: seg.actionId,
    actionLabel: t(`actions.${seg.actionId}`, { defaultValue: seg.actionId }),
    startOffset: seg.startTime - minStartTime,
    endOffset: seg.endTime - minStartTime,
    duration: seg.duration,
  }));

  const counterEvents: CounterEvent[] = rawCounterEvents.map((evt) => ({
    actionId: evt.actionId,
    actionLabel: t(`actions.${evt.actionId}`, { defaultValue: evt.actionId }),
    timestamp: evt.timestamp - minStartTime,
    drillId: drill.id,
  }));

  const seenActions = new Set<string>();
  const actionLabels: Array<{ actionId: string; actionLabel: string }> = [];

  segments.forEach((seg) => {
    if (!seenActions.has(seg.actionId)) {
      seenActions.add(seg.actionId);
      actionLabels.push({ actionId: seg.actionId, actionLabel: seg.actionLabel });
    }
  });
  counterEvents.forEach((evt) => {
    if (!seenActions.has(evt.actionId)) {
      seenActions.add(evt.actionId);
      actionLabels.push({ actionId: evt.actionId, actionLabel: evt.actionLabel });
    }
  });

  return { segments, counterEvents, actionLabels };
}

export function aggregateTimeByActionForDrill(
  drill: Drill,
  t: TFunction,
): Array<{ actionId: string; actionLabel: string; totalTime: number }> {
  const result: Array<{ actionId: string; actionLabel: string; totalTime: number }> = [];

  Object.entries(drill.timerData ?? {}).forEach(([actionId, td]) => {
    if (td.totalTime > 0) {
      result.push({
        actionId,
        actionLabel: t(`actions.${actionId}`, { defaultValue: actionId }),
        totalTime: td.totalTime,
      });
    }
  });

  if ((drill.wasteTime?.totalTime ?? 0) > 0) {
    result.push({
      actionId: 'wasteTime',
      actionLabel: t('timeWatcher.wasteTime', { defaultValue: 'Waste Time' }),
      totalTime: drill.wasteTime.totalTime,
    });
  }

  return result;
}
