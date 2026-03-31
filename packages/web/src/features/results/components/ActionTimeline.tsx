import { useRef, useState, useEffect } from 'react';
import { ACTION_COLORS, formatRelativeTime, type CounterEvent, type DrillBoundary } from '../lib/ganttUtils.js';

interface TimeSegment {
  actionId: string;
  actionLabel: string;
  startOffset: number;
  endOffset: number;
  duration: number;
}

interface Props {
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
const DRILL_LABEL_HEIGHT = 20;
const COUNTER_RADIUS = 5;

function calculateTicks(maxTime: number): number[] {
  if (maxTime <= 0) return [0];
  let interval: number;
  if (maxTime <= 60_000) interval = 10_000;
  else if (maxTime <= 180_000) interval = 30_000;
  else if (maxTime <= 600_000) interval = 60_000;
  else interval = 120_000;
  const ticks: number[] = [0];
  let tick = interval;
  while (tick <= maxTime) {
    ticks.push(tick);
    tick += interval;
  }
  return ticks;
}

export function ActionTimeline({
  segments,
  counterEvents = [],
  drillBoundaries = [],
  actionLabels,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if ((segments.length === 0 && counterEvents.length === 0) || actionLabels.length === 0) {
    return null;
  }

  const hasBoundaries = drillBoundaries.length > 1;
  const topPadding = hasBoundaries ? PADDING.top + DRILL_LABEL_HEIGHT : PADDING.top;
  const numRows = actionLabels.length;
  const height = numRows * ROW_HEIGHT + topPadding + PADDING.bottom;
  const chartWidth = width - LABEL_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = numRows * ROW_HEIGHT;

  const segMax = segments.length > 0 ? Math.max(...segments.map((s) => s.endOffset)) : 0;
  const ctrMax = counterEvents.length > 0 ? Math.max(...counterEvents.map((e) => e.timestamp)) : 0;
  const maxTime = Math.max(10_000, segMax, ctrMax);
  const ticks = calculateTicks(maxTime);

  const actionIndexMap = new Map<string, number>();
  actionLabels.forEach((item, idx) => actionIndexMap.set(item.actionId, idx));

  const xScale = (t: number) => LABEL_WIDTH + PADDING.left + (t / maxTime) * chartWidth;
  const yCenter = (actionId: string) => {
    const idx = actionIndexMap.get(actionId) ?? 0;
    return topPadding + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
  };

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      {width > 0 && (
        <svg width={width} height={height}>
          {/* Alternating row backgrounds */}
          {actionLabels.map((_, idx) => (
            <rect
              key={`bg-${idx}`}
              x={LABEL_WIDTH + PADDING.left}
              y={topPadding + idx * ROW_HEIGHT}
              width={chartWidth}
              height={ROW_HEIGHT}
              fill={idx % 2 === 0 ? '#fafafa' : '#ffffff'}
            />
          ))}

          {/* Drill boundary lines */}
          {hasBoundaries &&
            drillBoundaries.map((b, idx) => {
              if (b.startOffset === 0 && idx === 0) return null;
              const x = xScale(b.startOffset);
              return (
                <g key={`boundary-${b.drillId}`}>
                  <line
                    x1={x} y1={topPadding} x2={x} y2={topPadding + chartHeight}
                    stroke="#666" strokeWidth={1.5} strokeDasharray="4,3"
                  />
                  <text
                    x={x + 4} y={PADDING.top + 4}
                    textAnchor="start" dominantBaseline="hanging"
                    fontSize={10} fill="#666" fontWeight="500"
                  >
                    {b.drillLabel}
                  </text>
                </g>
              );
            })}

          {hasBoundaries && drillBoundaries.length > 0 && (
            <text
              x={LABEL_WIDTH + PADDING.left + 4} y={PADDING.top + 4}
              textAnchor="start" dominantBaseline="hanging"
              fontSize={10} fill="#666" fontWeight="500"
            >
              {drillBoundaries[0].drillLabel}
            </text>
          )}

          {/* Grid lines */}
          {ticks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={xScale(tick)} y1={topPadding}
              x2={xScale(tick)} y2={topPadding + chartHeight}
              stroke="#e8e8e8" strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {actionLabels.map((item, idx) => (
            <foreignObject
              key={`label-${item.actionId}`}
              x={0} y={topPadding + idx * ROW_HEIGHT}
              width={LABEL_WIDTH - 8} height={ROW_HEIGHT}
            >
              <div
                className="flex items-center h-full text-xs text-muted-foreground leading-tight px-1"
              >
                {item.actionLabel}
              </div>
            </foreignObject>
          ))}

          {/* Timer bars */}
          {segments.map((seg, i) => {
            const actionIdx = actionIndexMap.get(seg.actionId);
            if (actionIdx === undefined) return null;
            const x1 = xScale(seg.startOffset);
            const x2 = xScale(seg.endOffset);
            const barWidth = Math.max(x2 - x1, MIN_BAR_WIDTH);
            const y = topPadding + actionIdx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
            return (
              <rect
                key={`seg-${i}`}
                x={x1} y={y} width={barWidth} height={BAR_HEIGHT}
                fill={ACTION_COLORS[seg.actionId] ?? '#999'}
                opacity={0.9} rx={3} ry={3}
              >
                <title>{`${seg.actionLabel}: ${formatRelativeTime(seg.duration)}`}</title>
              </rect>
            );
          })}

          {/* Counter dots */}
          {counterEvents.map((evt, i) => {
            const actionIdx = actionIndexMap.get(evt.actionId);
            if (actionIdx === undefined) return null;
            return (
              <circle
                key={`counter-${i}`}
                cx={xScale(evt.timestamp)} cy={yCenter(evt.actionId)}
                r={COUNTER_RADIUS}
                fill={ACTION_COLORS[evt.actionId] ?? '#999'}
                stroke="#fff" strokeWidth={1.5}
              >
                <title>{`${evt.actionLabel} @ ${formatRelativeTime(evt.timestamp)}`}</title>
              </circle>
            );
          })}

          {/* X-axis */}
          <line
            x1={LABEL_WIDTH + PADDING.left} y1={topPadding + chartHeight}
            x2={LABEL_WIDTH + PADDING.left + chartWidth} y2={topPadding + chartHeight}
            stroke="#999" strokeWidth={1}
          />
          {ticks.map((tick) => (
            <g key={`tick-${tick}`}>
              <line
                x1={xScale(tick)} y1={topPadding + chartHeight}
                x2={xScale(tick)} y2={topPadding + chartHeight + 5}
                stroke="#999" strokeWidth={1}
              />
              <text
                x={xScale(tick)} y={topPadding + chartHeight + 20}
                textAnchor="middle" fontSize={11} fill="#666"
              >
                {formatRelativeTime(tick)}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
