import { TFunction } from 'i18next';

export interface GanttSegment {
    drillId: number;
    drillLabel: string;
    actionId: string;
    actionLabel: string;
    startOffset: number;  // ms from training start
    endOffset: number;
    duration: number;
    color: string;
}

export const ACTION_COLORS: Record<string, string> = {
    // Timer actions
    explanation: '#0088FE',
    demonstration: '#00C49F',
    feedbackteam: '#FFBB28',
    changesideone: '#FF8042',
    changesidetwo: '#FF6666',
    timemoving: '#A28BFE',
    wasteTime: '#808080',
    // Counter actions
    repetition: '#E91E63',
    feedbackplayers: '#9C27B0',
    shots: '#F44336',
    passes: '#4CAF50',
};

interface TimerData {
    totalTime: number;
    timeSegments: Array<{
        startTime: number;
        endTime: number | null;
        duration: number;
    }>;
}

interface CounterData {
    count: number;
    timestamps: number[];
}

interface Drill {
    id: number;
    tags: Set<string>;
    timerData: Record<string, TimerData>;
    counterData: Record<string, CounterData>;
    wasteTime: number;
}

export interface CounterEvent {
    actionId: string;
    actionLabel: string;
    timestamp: number;  // ms from training start
    drillId: number;
}

export interface DrillBoundary {
    drillId: number;
    drillLabel: string;
    startOffset: number;  // ms from training start
}

export function drillsToGanttSegments(
    drills: Drill[],
    t: TFunction
): GanttSegment[] {
    // 1. Collect all segments with absolute timestamps first
    const rawSegments: Array<{
        drillId: number;
        actionId: string;
        startTime: number;
        endTime: number;
        duration: number;
    }> = [];

    drills.forEach((drill) => {
        Object.entries(drill.timerData || {}).forEach(([actionId, timerData]) => {
            if (!timerData.timeSegments || timerData.timeSegments.length === 0) return;

            timerData.timeSegments.forEach((segment) => {
                if (segment.startTime && segment.endTime) {
                    rawSegments.push({
                        drillId: drill.id,
                        actionId,
                        startTime: segment.startTime,
                        endTime: segment.endTime,
                        duration: segment.duration,
                    });
                }
            });
        });
    });

    // Return empty if no segments
    if (rawSegments.length === 0) {
        return [];
    }

    // 2. Find the earliest start time
    const minStartTime = Math.min(...rawSegments.map(s => s.startTime));

    // 3. Calculate offsets relative to the earliest time
    const segments: GanttSegment[] = rawSegments.map(seg => ({
        drillId: seg.drillId,
        drillLabel: `${t('results.drill')} ${seg.drillId}`,
        actionId: seg.actionId,
        actionLabel: t(`actions.${seg.actionId}`) || seg.actionId,
        color: ACTION_COLORS[seg.actionId] || '#999999',
        startOffset: seg.startTime - minStartTime,
        endOffset: seg.endTime - minStartTime,
        duration: seg.duration,
    }));

    // Sort segments by start offset
    segments.sort((a, b) => a.startOffset - b.startOffset);

    return segments;
}

export function formatRelativeTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getUsedActions(segments: GanttSegment[]): { actionId: string; actionLabel: string; color: string }[] {
    const usedActionsMap = new Map<string, { actionLabel: string; color: string }>();

    segments.forEach((segment) => {
        if (!usedActionsMap.has(segment.actionId)) {
            usedActionsMap.set(segment.actionId, {
                actionLabel: segment.actionLabel,
                color: segment.color,
            });
        }
    });

    return Array.from(usedActionsMap.entries()).map(([actionId, data]) => ({
        actionId,
        ...data,
    }));
}

export function getSegmentsForDrill(segments: GanttSegment[], drillId: number): GanttSegment[] {
    return segments.filter((segment) => segment.drillId === drillId);
}

export function groupSegmentsByAction(segments: GanttSegment[]): Map<string, GanttSegment[]> {
    const grouped = new Map<string, GanttSegment[]>();

    segments.forEach((segment) => {
        const existing = grouped.get(segment.actionId) || [];
        existing.push(segment);
        grouped.set(segment.actionId, existing);
    });

    return grouped;
}

// Extrahiert alle Zeit-Segmente für die Timeline-Ansicht (gruppiert nach Aktion)
export function extractTimelineSegments(
    drills: Drill[],
    t: TFunction
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

    // Collect all segments and counter events with absolute timestamps
    drills.forEach((drill) => {
        // Timer segments
        Object.entries(drill.timerData || {}).forEach(([actionId, timerData]) => {
            if (!timerData.timeSegments || timerData.timeSegments.length === 0) return;

            timerData.timeSegments.forEach((segment) => {
                if (segment.startTime && segment.endTime) {
                    rawSegments.push({
                        actionId,
                        startTime: segment.startTime,
                        endTime: segment.endTime,
                        duration: segment.duration,
                    });
                }
            });
        });

        // Counter events
        Object.entries(drill.counterData || {}).forEach(([actionId, counterData]) => {
            if (!counterData.timestamps || counterData.timestamps.length === 0) return;

            counterData.timestamps.forEach((ts) => {
                rawCounterEvents.push({
                    actionId,
                    timestamp: ts,
                    drillId: drill.id,
                });
            });
        });
    });

    // Collect all timestamps to find min time
    const allTimestamps: number[] = [
        ...rawSegments.map(s => s.startTime),
        ...rawSegments.map(s => s.endTime),
        ...rawCounterEvents.map(e => e.timestamp),
    ];

    if (allTimestamps.length === 0) {
        return { segments: [], counterEvents: [], drillBoundaries: [], actionLabels: [] };
    }

    // Find earliest start time
    const minStartTime = Math.min(...allTimestamps);

    // Convert timer segments to relative offsets
    const segments = rawSegments.map(seg => ({
        actionId: seg.actionId,
        actionLabel: t(`actions.${seg.actionId}`) || seg.actionId,
        startOffset: seg.startTime - minStartTime,
        endOffset: seg.endTime - minStartTime,
        duration: seg.duration,
    }));

    // Convert counter events to relative offsets
    const counterEvents: CounterEvent[] = rawCounterEvents.map(evt => ({
        actionId: evt.actionId,
        actionLabel: t(`actions.${evt.actionId}`) || evt.actionId,
        timestamp: evt.timestamp - minStartTime,
        drillId: evt.drillId,
    }));

    // Calculate drill boundaries based on first event/segment per drill
    const drillBoundaries: DrillBoundary[] = [];
    const drillStartTimes = new Map<number, number>();

    // Note: rawSegments iteration removed - drill boundaries calculated below

    // Re-iterate to properly calculate drill boundaries
    drills.forEach((drill) => {
        let earliestTime = Infinity;

        // Check timer segments
        Object.values(drill.timerData || {}).forEach((timerData) => {
            timerData.timeSegments?.forEach((segment) => {
                if (segment.startTime && segment.startTime < earliestTime) {
                    earliestTime = segment.startTime;
                }
            });
        });

        // Check counter events
        Object.values(drill.counterData || {}).forEach((counterData) => {
            counterData.timestamps?.forEach((ts) => {
                if (ts < earliestTime) {
                    earliestTime = ts;
                }
            });
        });

        if (earliestTime !== Infinity) {
            drillStartTimes.set(drill.id, earliestTime);
        }
    });

    // Convert to boundaries sorted by time
    const sortedDrills = Array.from(drillStartTimes.entries())
        .sort((a, b) => a[1] - b[1]);

    sortedDrills.forEach(([drillId, startTime]) => {
        drillBoundaries.push({
            drillId,
            drillLabel: `${t('results.drill')} ${drillId}`,
            startOffset: startTime - minStartTime,
        });
    });

    // Get unique action labels (timers first, then counters)
    const seenActions = new Set<string>();
    const actionLabels: Array<{ actionId: string; actionLabel: string }> = [];

    // Add timer actions first
    segments.forEach(seg => {
        if (!seenActions.has(seg.actionId)) {
            seenActions.add(seg.actionId);
            actionLabels.push({
                actionId: seg.actionId,
                actionLabel: seg.actionLabel,
            });
        }
    });

    // Then add counter actions
    counterEvents.forEach(evt => {
        if (!seenActions.has(evt.actionId)) {
            seenActions.add(evt.actionId);
            actionLabels.push({
                actionId: evt.actionId,
                actionLabel: evt.actionLabel,
            });
        }
    });

    return { segments, counterEvents, drillBoundaries, actionLabels };
}

// Berechnet Start- und Endzeiten für jeden Drill (für Übersichts-Timeline)
export interface DrillDuration {
    drillId: number;
    drillLabel: string;
    startOffset: number;  // ms from training start
    endOffset: number;
    duration: number;
    tags: string[];
}

export function extractDrillDurations(
    drills: Drill[],
    t: TFunction
): DrillDuration[] {
    const drillTimes: Array<{
        drillId: number;
        startTime: number;
        endTime: number;
        tags: Set<string>;
    }> = [];

    drills.forEach((drill) => {
        let earliestTime = Infinity;
        let latestTime = -Infinity;

        // Check timer segments for start/end times
        Object.values(drill.timerData || {}).forEach((timerData) => {
            timerData.timeSegments?.forEach((segment) => {
                if (segment.startTime && segment.startTime < earliestTime) {
                    earliestTime = segment.startTime;
                }
                if (segment.endTime && segment.endTime > latestTime) {
                    latestTime = segment.endTime;
                }
            });
        });

        // Check counter events
        Object.values(drill.counterData || {}).forEach((counterData) => {
            counterData.timestamps?.forEach((ts) => {
                if (ts < earliestTime) {
                    earliestTime = ts;
                }
                if (ts > latestTime) {
                    latestTime = ts;
                }
            });
        });

        if (earliestTime !== Infinity && latestTime !== -Infinity) {
            drillTimes.push({
                drillId: drill.id,
                startTime: earliestTime,
                endTime: latestTime,
                tags: drill.tags || new Set(),
            });
        }
    });

    if (drillTimes.length === 0) {
        return [];
    }

    // Find earliest time as reference
    const minStartTime = Math.min(...drillTimes.map(d => d.startTime));

    // Convert to relative offsets and sort by start time
    return drillTimes
        .map(d => {
            const tagArray = Array.from(d.tags);
            const tagString = tagArray.length > 0
                ? ` (${tagArray.map(tag => t('drills.' + tag) || tag).join(', ')})`
                : '';
            return {
                drillId: d.drillId,
                drillLabel: `${t('results.drill')} ${d.drillId}${tagString}`,
                startOffset: d.startTime - minStartTime,
                endOffset: d.endTime - minStartTime,
                duration: d.endTime - d.startTime,
                tags: tagArray,
            };
        })
        .sort((a, b) => a.startOffset - b.startOffset);
}

// Aggregiert Gesamtzeit pro Aktionstyp aus allen Drills
export function aggregateTimeByAction(
    drills: Drill[],
    t: TFunction
): Array<{ actionId: string; actionLabel: string; totalTime: number }> {
    const actionTimes = new Map<string, number>();

    drills.forEach((drill) => {
        Object.entries(drill.timerData || {}).forEach(([actionId, timerData]) => {
            const current = actionTimes.get(actionId) || 0;
            actionTimes.set(actionId, current + (timerData.totalTime || 0));
        });
    });

    return Array.from(actionTimes.entries())
        .filter(([, totalTime]) => totalTime > 0)
        .map(([actionId, totalTime]) => ({
            actionId,
            actionLabel: t(`actions.${actionId}`) || actionId,
            totalTime,
        }));
}

// Aggregiert Gesamtzeit pro Aktionstyp für einen einzelnen Drill
export function aggregateTimeByActionForDrill(
    drill: Drill,
    t: TFunction
): Array<{ actionId: string; actionLabel: string; totalTime: number }> {
    const result: Array<{ actionId: string; actionLabel: string; totalTime: number }> = [];

    Object.entries(drill.timerData || {}).forEach(([actionId, timerData]) => {
        if (timerData.totalTime > 0) {
            result.push({
                actionId,
                actionLabel: t(`actions.${actionId}`) || actionId,
                totalTime: timerData.totalTime,
            });
        }
    });

    // Add waste time if present
    if (drill.wasteTime > 0) {
        result.push({
            actionId: 'wasteTime',
            actionLabel: t('results.wasteTime') || 'Waste Time',
            totalTime: drill.wasteTime,
        });
    }

    return result;
}

// Extrahiert Timeline-Segmente für einen einzelnen Drill
export function extractTimelineSegmentsForDrill(
    drill: Drill,
    t: TFunction
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

    const rawCounterEvents: Array<{
        actionId: string;
        timestamp: number;
    }> = [];

    // Timer segments
    Object.entries(drill.timerData || {}).forEach(([actionId, timerData]) => {
        if (!timerData.timeSegments || timerData.timeSegments.length === 0) return;

        timerData.timeSegments.forEach((segment) => {
            if (segment.startTime && segment.endTime) {
                rawSegments.push({
                    actionId,
                    startTime: segment.startTime,
                    endTime: segment.endTime,
                    duration: segment.duration,
                });
            }
        });
    });

    // Counter events
    Object.entries(drill.counterData || {}).forEach(([actionId, counterData]) => {
        if (!counterData.timestamps || counterData.timestamps.length === 0) return;

        counterData.timestamps.forEach((ts) => {
            rawCounterEvents.push({
                actionId,
                timestamp: ts,
            });
        });
    });

    // Collect all timestamps to find min time
    const allTimestamps: number[] = [
        ...rawSegments.map(s => s.startTime),
        ...rawSegments.map(s => s.endTime),
        ...rawCounterEvents.map(e => e.timestamp),
    ];

    if (allTimestamps.length === 0) {
        return { segments: [], counterEvents: [], actionLabels: [] };
    }

    // Find earliest start time
    const minStartTime = Math.min(...allTimestamps);

    // Convert timer segments to relative offsets
    const segments = rawSegments.map(seg => ({
        actionId: seg.actionId,
        actionLabel: t(`actions.${seg.actionId}`) || seg.actionId,
        startOffset: seg.startTime - minStartTime,
        endOffset: seg.endTime - minStartTime,
        duration: seg.duration,
    }));

    // Convert counter events to relative offsets
    const counterEvents: CounterEvent[] = rawCounterEvents.map(evt => ({
        actionId: evt.actionId,
        actionLabel: t(`actions.${evt.actionId}`) || evt.actionId,
        timestamp: evt.timestamp - minStartTime,
        drillId: drill.id,
    }));

    // Get unique action labels (timers first, then counters)
    const seenActions = new Set<string>();
    const actionLabels: Array<{ actionId: string; actionLabel: string }> = [];

    // Add timer actions first
    segments.forEach(seg => {
        if (!seenActions.has(seg.actionId)) {
            seenActions.add(seg.actionId);
            actionLabels.push({
                actionId: seg.actionId,
                actionLabel: seg.actionLabel,
            });
        }
    });

    // Then add counter actions
    counterEvents.forEach(evt => {
        if (!seenActions.has(evt.actionId)) {
            seenActions.add(evt.actionId);
            actionLabels.push({
                actionId: evt.actionId,
                actionLabel: evt.actionLabel,
            });
        }
    });

    return { segments, counterEvents, actionLabels };
}
