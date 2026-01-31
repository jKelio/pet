import React, { useRef, useState, useEffect } from 'react';
import { ACTION_COLORS, formatRelativeTime, CounterEvent, DrillBoundary } from './ganttUtils';
import './ActionTimeline.css';

interface TimeSegment {
    actionId: string;
    actionLabel: string;
    startOffset: number;  // ms from training start
    endOffset: number;
    duration: number;
}

interface ActionTimelineProps {
    segments: TimeSegment[];
    counterEvents?: CounterEvent[];
    drillBoundaries?: DrillBoundary[];
    actionLabels: { actionId: string; actionLabel: string }[];
}

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 110;
const PADDING = { top: 10, right: 20, bottom: 35, left: 10 };
const BAR_HEIGHT = 22;
const MIN_BAR_WIDTH = 4;

// Generate tick values for the time axis
function calculateTicks(maxTime: number): number[] {
    if (maxTime <= 0) return [0];

    let interval: number;
    if (maxTime <= 60000) interval = 10000;
    else if (maxTime <= 180000) interval = 30000;
    else if (maxTime <= 600000) interval = 60000;
    else interval = 120000;

    const ticks: number[] = [0];
    let tick = interval;
    while (tick <= maxTime) {
        ticks.push(tick);
        tick += interval;
    }
    return ticks;
}

const DRILL_LABEL_HEIGHT = 20;
const COUNTER_RADIUS = 5;

const ActionTimeline: React.FC<ActionTimelineProps> = ({
    segments,
    counterEvents = [],
    drillBoundaries = [],
    actionLabels,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    if ((segments.length === 0 && counterEvents.length === 0) || actionLabels.length === 0) {
        return null;
    }

    const hasDrillBoundaries = drillBoundaries.length > 1;
    const topPadding = hasDrillBoundaries ? PADDING.top + DRILL_LABEL_HEIGHT : PADDING.top;

    const numRows = actionLabels.length;
    const height = numRows * ROW_HEIGHT + topPadding + PADDING.bottom;
    const chartWidth = width - LABEL_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = numRows * ROW_HEIGHT;

    // Calculate time range including counter events
    const segmentMaxTime = segments.length > 0 ? Math.max(...segments.map(s => s.endOffset)) : 0;
    const counterMaxTime = counterEvents.length > 0 ? Math.max(...counterEvents.map(e => e.timestamp)) : 0;
    const maxTime = Math.max(10000, segmentMaxTime, counterMaxTime);
    const ticks = calculateTicks(maxTime);

    // Create action index map
    const actionIndexMap = new Map<string, number>();
    actionLabels.forEach((item, idx) => {
        actionIndexMap.set(item.actionId, idx);
    });

    // Scale functions
    const xScale = (time: number) => {
        return LABEL_WIDTH + PADDING.left + (time / maxTime) * chartWidth;
    };

    const yCenter = (actionId: string) => {
        const idx = actionIndexMap.get(actionId) ?? 0;
        return topPadding + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
    };

    return (
        <div ref={containerRef} className="action-timeline-container">
            {width > 0 && (
                <svg width={width} height={height} className="action-timeline-svg">
                    {/* Background rows */}
                    {actionLabels.map((_, idx) => (
                        <rect
                            key={`row-bg-${idx}`}
                            x={LABEL_WIDTH + PADDING.left}
                            y={topPadding + idx * ROW_HEIGHT}
                            width={chartWidth}
                            height={ROW_HEIGHT}
                            fill={idx % 2 === 0 ? '#fafafa' : '#fff'}
                        />
                    ))}

                    {/* Drill boundary lines (vertical dashed lines) */}
                    {hasDrillBoundaries && drillBoundaries.map((boundary, idx) => {
                        // Skip first boundary line at time 0
                        if (boundary.startOffset === 0 && idx === 0) return null;

                        const x = xScale(boundary.startOffset);
                        return (
                            <g key={`drill-boundary-${boundary.drillId}`}>
                                {/* Dashed vertical line */}
                                <line
                                    x1={x}
                                    y1={topPadding}
                                    x2={x}
                                    y2={topPadding + chartHeight}
                                    stroke="#666"
                                    strokeWidth={1.5}
                                    strokeDasharray="4,3"
                                />
                                {/* Drill label above the chart */}
                                <text
                                    x={x + 4}
                                    y={PADDING.top + 4}
                                    textAnchor="start"
                                    dominantBaseline="hanging"
                                    fontSize={10}
                                    fill="#666"
                                    fontWeight="500"
                                >
                                    {boundary.drillLabel}
                                </text>
                            </g>
                        );
                    })}

                    {/* First drill label at the start */}
                    {hasDrillBoundaries && drillBoundaries.length > 0 && (
                        <text
                            x={LABEL_WIDTH + PADDING.left + 4}
                            y={PADDING.top + 4}
                            textAnchor="start"
                            dominantBaseline="hanging"
                            fontSize={10}
                            fill="#666"
                            fontWeight="500"
                        >
                            {drillBoundaries[0].drillLabel}
                        </text>
                    )}

                    {/* Grid lines for ticks */}
                    {ticks.map((tick) => (
                        <line
                            key={`grid-${tick}`}
                            x1={xScale(tick)}
                            y1={topPadding}
                            x2={xScale(tick)}
                            y2={topPadding + chartHeight}
                            stroke="#e8e8e8"
                            strokeWidth={1}
                        />
                    ))}

                    {/* Y-Axis labels with text wrapping */}
                    {actionLabels.map((item, idx) => (
                        <foreignObject
                            key={`label-${item.actionId}`}
                            x={0}
                            y={topPadding + idx * ROW_HEIGHT}
                            width={LABEL_WIDTH - 8}
                            height={ROW_HEIGHT}
                        >
                            <div className="action-timeline-label">
                                {item.actionLabel}
                            </div>
                        </foreignObject>
                    ))}

                    {/* Time segments as bars */}
                    {segments.map((segment, index) => {
                        const actionIdx = actionIndexMap.get(segment.actionId);
                        if (actionIdx === undefined) return null;

                        const x1 = xScale(segment.startOffset);
                        const x2 = xScale(segment.endOffset);
                        const barWidth = Math.max(x2 - x1, MIN_BAR_WIDTH);
                        const y = topPadding + actionIdx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

                        return (
                            <rect
                                key={`segment-${index}`}
                                x={x1}
                                y={y}
                                width={barWidth}
                                height={BAR_HEIGHT}
                                fill={ACTION_COLORS[segment.actionId] || '#999'}
                                opacity={0.9}
                                rx={3}
                                ry={3}
                            >
                                <title>{`${segment.actionLabel}: ${formatRelativeTime(segment.duration)}`}</title>
                            </rect>
                        );
                    })}

                    {/* Counter events as circles */}
                    {counterEvents.map((event, index) => {
                        const actionIdx = actionIndexMap.get(event.actionId);
                        if (actionIdx === undefined) return null;

                        const cx = xScale(event.timestamp);
                        const cy = yCenter(event.actionId);

                        return (
                            <circle
                                key={`counter-${index}`}
                                cx={cx}
                                cy={cy}
                                r={COUNTER_RADIUS}
                                fill={ACTION_COLORS[event.actionId] || '#999'}
                                stroke="#fff"
                                strokeWidth={1.5}
                            >
                                <title>{`${event.actionLabel} @ ${formatRelativeTime(event.timestamp)}`}</title>
                            </circle>
                        );
                    })}

                    {/* X-Axis line */}
                    <line
                        x1={LABEL_WIDTH + PADDING.left}
                        y1={topPadding + chartHeight}
                        x2={LABEL_WIDTH + PADDING.left + chartWidth}
                        y2={topPadding + chartHeight}
                        stroke="#999"
                        strokeWidth={1}
                    />

                    {/* X-Axis ticks and labels */}
                    {ticks.map((tick) => (
                        <g key={`tick-${tick}`}>
                            <line
                                x1={xScale(tick)}
                                y1={topPadding + chartHeight}
                                x2={xScale(tick)}
                                y2={topPadding + chartHeight + 5}
                                stroke="#999"
                                strokeWidth={1}
                            />
                            <text
                                x={xScale(tick)}
                                y={topPadding + chartHeight + 20}
                                textAnchor="middle"
                                fontSize={11}
                                fill="#666"
                            >
                                {formatRelativeTime(tick)}
                            </text>
                        </g>
                    ))}
                </svg>
            )}
        </div>
    );
};

export default ActionTimeline;
