import React from 'react';
import {
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Customized,
} from 'recharts';
import { GanttSegment, formatRelativeTime } from './ganttUtils';

interface GanttChartProps {
    segments: GanttSegment[];
    drillLabels: string[];
    height?: number;
    barHeight?: number;
}

const MIN_BAR_WIDTH = 2; // minimum width in pixels for very short segments

// Berechnet sinnvolle Tick-Werte für die Zeitachse
function calculateTicks(maxTime: number): number[] {
    if (maxTime <= 0) return [0];

    // Intervall wählen: 30s, 1min, 2min, 5min je nach Gesamtdauer
    let interval: number;
    if (maxTime <= 60000) interval = 10000;        // bis 1min: alle 10s
    else if (maxTime <= 180000) interval = 30000;  // bis 3min: alle 30s
    else if (maxTime <= 600000) interval = 60000;  // bis 10min: alle 1min
    else interval = 120000;                        // darüber: alle 2min

    const ticks: number[] = [0];
    let tick = interval;
    while (tick <= maxTime) {
        ticks.push(tick);
        tick += interval;
    }
    return ticks;
}

// Custom renderer component for Gantt bars
const GanttBarsRenderer: React.FC<{
    xAxisMap?: Record<number, any>;
    yAxisMap?: Record<number, any>;
    segments: GanttSegment[];
    barHeight: number;
    drillLabels: string[];
}> = ({ xAxisMap, yAxisMap, segments, barHeight, drillLabels }) => {
    if (!xAxisMap || !yAxisMap) return null;

    const xAxis = xAxisMap[0];
    const yAxis = yAxisMap[0];

    if (!xAxis || !yAxis) return null;

    const xScale = xAxis.scale;
    const yScale = yAxis.scale;
    const bandwidth = yScale.bandwidth ? yScale.bandwidth() : barHeight;
    const domain = yScale.domain ? yScale.domain() : [];

    // Debug logging
    console.log('GanttBarsRenderer Debug:', {
        segmentsCount: segments.length,
        drillLabels,
        domain,
        bandwidth,
        sampleSegment: segments[0],
    });

    return (
        <g>
            {segments.map((segment, index) => {
                const x1 = xScale(segment.startOffset);
                const x2 = xScale(segment.endOffset);

                // Find the drill index based on drillId
                const drillIndex = segment.drillId - 1; // drillId is 1-based
                const domainValue = domain[drillIndex];
                const y = domainValue !== undefined ? yScale(domainValue) : undefined;

                console.log(`Segment ${index}:`, {
                    drillId: segment.drillId,
                    drillLabel: segment.drillLabel,
                    drillIndex,
                    domainValue,
                    y,
                    x1,
                    x2,
                });

                if (y === undefined || x1 === undefined || x2 === undefined) return null;

                // Ensure minimum width for visibility
                const width = Math.max(x2 - x1, MIN_BAR_WIDTH);

                return (
                    <rect
                        key={`segment-${index}`}
                        x={x1}
                        y={y + (bandwidth - barHeight) / 2}
                        width={width}
                        height={barHeight}
                        fill={segment.color}
                        opacity={0.85}
                        rx={2}
                        ry={2}
                    />
                );
            })}
        </g>
    );
};

const GanttChart: React.FC<GanttChartProps> = ({
    segments,
    drillLabels,
    height = 200,
    barHeight = 24,
}) => {
    if (segments.length === 0) {
        return null;
    }

    // Calculate max time for X-axis domain (minimum 10 seconds for visibility)
    const maxTime = Math.max(10000, ...segments.map((s) => s.endOffset));

    // Prepare data for YAxis (one entry per drill)
    const yAxisData = drillLabels.map((label) => ({ name: label }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ComposedChart
                layout="vertical"
                data={yAxisData}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
            >
                <XAxis
                    type="number"
                    domain={[0, maxTime]}
                    ticks={calculateTicks(maxTime)}
                    tickFormatter={formatRelativeTime}
                    stroke="#666"
                    fontSize={12}
                    tickLine={true}
                    axisLine={true}
                    allowDataOverflow={false}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    stroke="#666"
                    fontSize={12}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;

                        // Find segments at the hovered position
                        const hoveredSegment = segments.find(
                            (s) => s.drillLabel === payload[0]?.payload?.name
                        );

                        if (!hoveredSegment) return null;

                        return (
                            <div
                                style={{
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                }}
                            >
                                <div>
                                    <strong>{hoveredSegment.actionLabel}</strong>
                                </div>
                                <div>Duration: {formatRelativeTime(hoveredSegment.duration)}</div>
                            </div>
                        );
                    }}
                />
                <Customized
                    component={(props: any) => (
                        <GanttBarsRenderer
                            {...props}
                            segments={segments}
                            barHeight={barHeight}
                            drillLabels={drillLabels}
                        />
                    )}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default GanttChart;
