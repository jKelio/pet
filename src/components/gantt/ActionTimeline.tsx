import React, { useRef, useState, useEffect } from 'react';
import { ACTION_COLORS, formatRelativeTime } from './ganttUtils';

interface TimeSegment {
    actionId: string;
    actionLabel: string;
    startOffset: number;  // ms from training start
    endOffset: number;
    duration: number;
}

interface ActionTimelineProps {
    segments: TimeSegment[];
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

const ActionTimeline: React.FC<ActionTimelineProps> = ({
    segments,
    actionLabels,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Debug: Log received data
    console.log('ActionTimeline data:', {
        segmentsCount: segments.length,
        segments: segments.map(s => ({
            action: s.actionId,
            start: s.startOffset,
            end: s.endOffset,
            duration: s.duration
        })),
        actionLabels
    });

    if (segments.length === 0 || actionLabels.length === 0) {
        return null;
    }

    const numRows = actionLabels.length;
    const height = numRows * ROW_HEIGHT + PADDING.top + PADDING.bottom;
    const chartWidth = width - LABEL_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = numRows * ROW_HEIGHT;

    // Calculate time range
    const maxTime = Math.max(10000, ...segments.map(s => s.endOffset));
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
        return PADDING.top + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
    };

    return (
        <div ref={containerRef} style={{ width: '100%' }}>
            {width > 0 && (
                <svg width={width} height={height} style={{ display: 'block' }}>
                    {/* Background rows */}
                    {actionLabels.map((_, idx) => (
                        <rect
                            key={`row-bg-${idx}`}
                            x={LABEL_WIDTH + PADDING.left}
                            y={PADDING.top + idx * ROW_HEIGHT}
                            width={chartWidth}
                            height={ROW_HEIGHT}
                            fill={idx % 2 === 0 ? '#fafafa' : '#fff'}
                        />
                    ))}

                    {/* Grid lines for ticks */}
                    {ticks.map((tick) => (
                        <line
                            key={`grid-${tick}`}
                            x1={xScale(tick)}
                            y1={PADDING.top}
                            x2={xScale(tick)}
                            y2={PADDING.top + chartHeight}
                            stroke="#e8e8e8"
                            strokeWidth={1}
                        />
                    ))}

                    {/* Y-Axis labels */}
                    {actionLabels.map((item, idx) => (
                        <text
                            key={`label-${item.actionId}`}
                            x={LABEL_WIDTH - 8}
                            y={yCenter(item.actionId)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fontSize={11}
                            fill="#333"
                        >
                            {item.actionLabel}
                        </text>
                    ))}

                    {/* Time segments as bars */}
                    {segments.map((segment, index) => {
                        const actionIdx = actionIndexMap.get(segment.actionId);
                        if (actionIdx === undefined) return null;

                        const x1 = xScale(segment.startOffset);
                        const x2 = xScale(segment.endOffset);
                        const barWidth = Math.max(x2 - x1, MIN_BAR_WIDTH);
                        const y = PADDING.top + actionIdx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

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

                    {/* X-Axis line */}
                    <line
                        x1={LABEL_WIDTH + PADDING.left}
                        y1={PADDING.top + chartHeight}
                        x2={LABEL_WIDTH + PADDING.left + chartWidth}
                        y2={PADDING.top + chartHeight}
                        stroke="#999"
                        strokeWidth={1}
                    />

                    {/* X-Axis ticks and labels */}
                    {ticks.map((tick) => (
                        <g key={`tick-${tick}`}>
                            <line
                                x1={xScale(tick)}
                                y1={PADDING.top + chartHeight}
                                x2={xScale(tick)}
                                y2={PADDING.top + chartHeight + 5}
                                stroke="#999"
                                strokeWidth={1}
                            />
                            <text
                                x={xScale(tick)}
                                y={PADDING.top + chartHeight + 20}
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
