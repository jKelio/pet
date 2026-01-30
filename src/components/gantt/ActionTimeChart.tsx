import React, { useRef, useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
} from 'recharts';
import { ACTION_COLORS } from './ganttUtils';

interface ActionTimeData {
    actionId: string;
    actionLabel: string;
    totalTime: number; // in ms
}

interface ActionTimeChartProps {
    data: ActionTimeData[];
    height?: number;
}

// Format milliseconds to mm:ss
function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const ActionTimeChart: React.FC<ActionTimeChartProps> = ({
    data,
    height = 300,
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

    if (data.length === 0) {
        return null;
    }

    // Sort by total time descending
    const sortedData = [...data].sort((a, b) => b.totalTime - a.totalTime);

    return (
        <div ref={containerRef} style={{ width: '100%' }}>
            {width > 0 && (
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    width={width}
                    height={height}
                    margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                    <XAxis
                        type="number"
                        tickFormatter={formatTime}
                        stroke="#666"
                        fontSize={12}
                    />
                    <YAxis
                        type="category"
                        dataKey="actionLabel"
                        stroke="#666"
                        fontSize={12}
                        width={90}
                    />
                    <Tooltip
                        formatter={(value: number) => formatTime(value)}
                        labelFormatter={(label) => label}
                    />
                    <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
                        {sortedData.map((entry) => (
                            <Cell
                                key={entry.actionId}
                                fill={ACTION_COLORS[entry.actionId] || '#999999'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            )}
        </div>
    );
};

export default ActionTimeChart;
