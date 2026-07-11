import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { DRILL_COLORS, type Drill } from '@pet/shared';
import {
  extractTimelineSegmentsForDrill,
  aggregateTimeByActionForDrill,
  ACTION_COLORS,
  formatRelativeTime,
} from '../lib/ganttUtils.js';
import { formatDuration } from '../lib/formatDuration.js';
import { ActionTimeline } from './ActionTimeline.js';

/**
 * The per-drill results block (action Gantt timeline, time-distribution pie,
 * action bar chart, timer/counter tables). Renders nothing for a drill without
 * recorded data.
 */
export function DrillResultCard({ drill }: { drill: Drill }) {
  const { t } = useTranslation('pet');

  const actionData = aggregateTimeByActionForDrill(drill, t);
  const { segments: dSegs, counterEvents: dCtrEvents, actionLabels: dLabels } =
    extractTimelineSegmentsForDrill(drill, t);
  const hasData = actionData.length > 0 || dSegs.length > 0 || dCtrEvents.length > 0;
  if (!hasData) return null;

  const counterData = Object.entries(drill.counterData ?? {}).filter(([, cd]) => cd.count > 0);
  const timerData = Object.entries(drill.timerData ?? {}).filter(([, td]) => td.totalTime > 0);

  return (
    <section className="pdf-section space-y-4 @container">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {t('drills.drill')} {drill.id}
        {(drill.tags as string[]).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary normal-case tracking-normal"
          >
            {t(`drills.${tag}`)}
          </span>
        ))}
      </h2>

      {/* Gantt timeline */}
      {dSegs.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <ActionTimeline
            segments={dSegs}
            counterEvents={dCtrEvents}
            actionLabels={dLabels}
          />
        </div>
      )}

      {/* Pie + Bar charts */}
      {actionData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 grid @sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('results.timePerAction')}</p>
            <ResponsiveContainer width="100%" height={Math.max(200, actionData.length * 28 + 100)}>
              <PieChart>
                <Pie
                  data={actionData}
                  dataKey="totalTime"
                  nameKey="actionLabel"
                  cx="50%"
                  cy="45%"
                  outerRadius={70}
                >
                  {actionData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={ACTION_COLORS[entry.actionId] ?? DRILL_COLORS[i % DRILL_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                        <p className="font-medium mb-0.5">{payload[0].name}</p>
                        <p>{t('results.totalTime')}: {formatDuration(payload[0].value as number)}</p>
                      </div>
                    );
                  }}
                />
                <Legend formatter={(label) => <span className="text-xs">{label}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('results.timePerAction')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={actionData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatRelativeTime(v as number)}
                  fontSize={10}
                />
                <YAxis type="category" dataKey="actionLabel" fontSize={10} width={90} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                        <p className="font-medium mb-0.5">{payload[0].payload.actionLabel}</p>
                        <p>{t('results.totalTime')}: {formatDuration(payload[0].value as number)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
                  {actionData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={ACTION_COLORS[entry.actionId] ?? DRILL_COLORS[i % DRILL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Timer + Counter tables */}
      {(timerData.length > 0 || counterData.length > 0) && (
        <div className="grid @sm:grid-cols-2 gap-4">
          {timerData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-3">{t('results.stoppedTimes')}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">{t('results.action')}</th>
                    <th className="text-right pb-2 font-medium">{t('results.segments')}</th>
                    <th className="text-right pb-2 font-medium">{t('results.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {timerData.map(([actionId, td]) => (
                    <tr key={actionId} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: ACTION_COLORS[actionId] ?? '#999' }}
                        />
                        {t(`actions.${actionId}`, { defaultValue: actionId })}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {td.timeSegments?.length ?? 0}×
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-medium">
                        {formatDuration(td.totalTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {counterData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-3">{t('results.counters')}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">{t('results.action')}</th>
                    <th className="text-right pb-2 font-medium">{t('results.count')}</th>
                  </tr>
                </thead>
                <tbody>
                  {counterData.map(([actionId, cd]) => (
                    <tr key={actionId} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: ACTION_COLORS[actionId] ?? '#999' }}
                        />
                        {t(`actions.${actionId}`, { defaultValue: actionId })}
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-medium">
                        {cd.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
