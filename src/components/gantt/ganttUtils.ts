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
    explanation: '#0088FE',
    demonstration: '#00C49F',
    feedbackteam: '#FFBB28',
    changesideone: '#FF8042',
    changesidetwo: '#FF6666',
    timemoving: '#A28BFE',
    wasteTime: '#808080',
};

interface TimerData {
    totalTime: number;
    timeSegments: Array<{
        startTime: number;
        endTime: number | null;
        duration: number;
    }>;
}

interface Drill {
    id: number;
    tags: Set<string>;
    timerData: Record<string, TimerData>;
    wasteTime: number;
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
    actionLabels: Array<{ actionId: string; actionLabel: string }>;
} {
    const rawSegments: Array<{
        actionId: string;
        startTime: number;
        endTime: number;
        duration: number;
    }> = [];

    // Collect all segments with absolute timestamps
    drills.forEach((drill) => {
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
    });

    if (rawSegments.length === 0) {
        return { segments: [], actionLabels: [] };
    }

    // Find earliest start time
    const minStartTime = Math.min(...rawSegments.map(s => s.startTime));

    // Convert to relative offsets and add labels
    const segments = rawSegments.map(seg => ({
        actionId: seg.actionId,
        actionLabel: t(`actions.${seg.actionId}`) || seg.actionId,
        startOffset: seg.startTime - minStartTime,
        endOffset: seg.endTime - minStartTime,
        duration: seg.duration,
    }));

    // Get unique action labels (in order of first appearance)
    const seenActions = new Set<string>();
    const actionLabels: Array<{ actionId: string; actionLabel: string }> = [];
    segments.forEach(seg => {
        if (!seenActions.has(seg.actionId)) {
            seenActions.add(seg.actionId);
            actionLabels.push({
                actionId: seg.actionId,
                actionLabel: seg.actionLabel,
            });
        }
    });

    return { segments, actionLabels };
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
