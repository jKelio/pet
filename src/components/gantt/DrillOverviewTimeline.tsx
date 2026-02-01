import React, { useRef, useState, useEffect } from 'react';
import { DrillDuration, formatRelativeTime } from './ganttUtils';
import './DrillOverviewTimeline.css';

interface DrillOverviewTimelineProps {
    drillDurations: DrillDuration[];
}

const DRILL_COLORS = ['#0088FE', '#FF8042', '#00C49F', '#FFBB28', '#A28BFE', '#FF6699', '#33CC99', '#FF6666', '#66B3FF', '#FFCC99'];
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 120;
const PADDING = { top: 10, right: 20, bottom: 35, left: 10 };
const BAR_HEIGHT = 26;

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

const DrillOverviewTimeline: React.FC<DrillOverviewTimelineProps> = ({ drillDurations }) => {
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

    if (drillDurations.length === 0) {
        return null;
    }

    const numRows = drillDurations.length;
    const height = numRows * ROW_HEIGHT + PADDING.top + PADDING.bottom;
    const chartWidth = width - LABEL_WIDTH - PADDING.left - PADDING.right;

    const maxTime = Math.max(...drillDurations.map(d => d.endOffset), 10000);
    const ticks = calculateTicks(maxTime);

    const xScale = (time: number) => {
        return LABEL_WIDTH + PADDING.left + (time / maxTime) * chartWidth;
    };

    return (
        <div ref={containerRef} className="drill-overview-timeline-container">
            {width > 0 && (
                <svg width={width} height={height} className="drill-overview-timeline-svg">
                    {/* Background rows */}
                    {drillDurations.map((_, idx) => (
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
                            y2={PADDING.top + numRows * ROW_HEIGHT}
                            stroke="#e8e8e8"
                            strokeWidth={1}
                        />
                    ))}

                    {/* Y-Axis labels */}
                    {drillDurations.map((drill, idx) => (
                        <foreignObject
                            key={`label-${drill.drillId}`}
                            x={0}
                            y={PADDING.top + idx * ROW_HEIGHT}
                            width={LABEL_WIDTH - 8}
                            height={ROW_HEIGHT}
                        >
                            <div className="drill-overview-timeline-label">
                                {drill.drillLabel}
                            </div>
                        </foreignObject>
                    ))}

                    {/* Drill duration bars */}
                    {drillDurations.map((drill, idx) => {
                        const x1 = xScale(drill.startOffset);
                        const x2 = xScale(drill.endOffset);
                        const barWidth = Math.max(x2 - x1, 4);
                        const y = PADDING.top + idx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

                        return (
                            <rect
                                key={`bar-${drill.drillId}`}
                                x={x1}
                                y={y}
                                width={barWidth}
                                height={BAR_HEIGHT}
                                fill={DRILL_COLORS[idx % DRILL_COLORS.length]}
                                opacity={0.9}
                                rx={4}
                                ry={4}
                            >
                                <title>{`${drill.drillLabel}: ${formatRelativeTime(drill.duration)}`}</title>
                            </rect>
                        );
                    })}

                    {/* Duration labels on bars */}
                    {drillDurations.map((drill, idx) => {
                        const x1 = xScale(drill.startOffset);
                        const x2 = xScale(drill.endOffset);
                        const barWidth = x2 - x1;
                        const y = PADDING.top + idx * ROW_HEIGHT + ROW_HEIGHT / 2;

                        // Only show label if bar is wide enough
                        if (barWidth < 50) return null;

                        return (
                            <text
                                key={`duration-${drill.drillId}`}
                                x={x1 + barWidth / 2}
                                y={y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={12}
                                fill="#fff"
                                fontWeight="500"
                            >
                                {formatRelativeTime(drill.duration)}
                            </text>
                        );
                    })}

                    {/* X-Axis line */}
                    <line
                        x1={LABEL_WIDTH + PADDING.left}
                        y1={PADDING.top + numRows * ROW_HEIGHT}
                        x2={LABEL_WIDTH + PADDING.left + chartWidth}
                        y2={PADDING.top + numRows * ROW_HEIGHT}
                        stroke="#999"
                        strokeWidth={1}
                    />

                    {/* X-Axis ticks and labels */}
                    {ticks.map((tick) => (
                        <g key={`tick-${tick}`}>
                            <line
                                x1={xScale(tick)}
                                y1={PADDING.top + numRows * ROW_HEIGHT}
                                x2={xScale(tick)}
                                y2={PADDING.top + numRows * ROW_HEIGHT + 5}
                                stroke="#999"
                                strokeWidth={1}
                            />
                            <text
                                x={xScale(tick)}
                                y={PADDING.top + numRows * ROW_HEIGHT + 20}
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

export default DrillOverviewTimeline;
