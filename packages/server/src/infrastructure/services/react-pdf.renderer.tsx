import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font, renderToBuffer,
  Svg, G, Path, Rect, Circle, Line, Defs, LinearGradient, Stop,
} from '@react-pdf/renderer';
import type { PdfReportModel, Recommendation } from '@pet/shared';
import type { PdfRenderer } from '../../domain/ports/pdf-renderer.js';

type Locale = PdfReportModel['locale'];

// Static report chrome per locale. Dynamic content (action/tag labels, practice
// info) arrives already localized in the model.
const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    title: 'Training Report', summary: 'Summary', drills: 'Drills', totalTime: 'Total time',
    passiveTime: 'Passive time', passivePercent: 'Passive %', overall: 'Overall', stoppedTimes: 'Stopped times',
    counters: 'Counters', action: 'Action', segments: 'Segments', total: 'Total', count: 'Count',
    drill: 'Drill', club: 'Club', team: 'Team', coach: 'Coach', player: 'Player', date: 'Date',
    generated: 'Generated', page: 'Page',
    trainingTimeline: 'Training timeline', timePerDrill: 'Time per drill', timePerAction: 'Time per action',
  },
  de: {
    title: 'Trainingsbericht', summary: 'Übersicht', drills: 'Drills', totalTime: 'Gesamtzeit',
    passiveTime: 'Passivzeit', passivePercent: 'Passiv %', overall: 'Gesamt', stoppedTimes: 'Gestoppte Zeiten',
    counters: 'Zähler', action: 'Aktion', segments: 'Segmente', total: 'Gesamt', count: 'Anzahl',
    drill: 'Drill', club: 'Verein', team: 'Team', coach: 'Trainer', player: 'Spieler', date: 'Datum',
    generated: 'Erstellt', page: 'Seite',
    trainingTimeline: 'Trainings-Zeitleiste', timePerDrill: 'Zeit pro Drill', timePerAction: 'Zeit pro Aktion',
  },
  ru: {
    title: 'Отчёт о тренировке', summary: 'Сводка', drills: 'Упражнения', totalTime: 'Общее время',
    passiveTime: 'Простой', passivePercent: 'Простой %', overall: 'Итого', stoppedTimes: 'Засечённое время',
    counters: 'Счётчики', action: 'Действие', segments: 'Сегменты', total: 'Всего', count: 'Кол-во',
    drill: 'Упражнение', club: 'Клуб', team: 'Команда', coach: 'Тренер', player: 'Игрок', date: 'Дата',
    generated: 'Создано', page: 'Стр.',
    trainingTimeline: 'Хронология тренировки', timePerDrill: 'Время на упражнение', timePerAction: 'Время на действие',
  },
};

// The bundled font family to render with. Helvetica (the built-in default) covers
// Latin-1 — fine for en/de including umlauts/ß. Cyrillic (ru, or Cyrillic names)
// needs a Unicode TTF: set PDF_FONT_PATH to a font file covering Latin+Cyrillic
// and it is registered as 'PetSans'. See docs/adr/0009-server-side-pdf-report.md.
const FONT_FAMILY = registerFontFromEnv();

function registerFontFromEnv(): string {
  const path = process.env.PDF_FONT_PATH;
  if (!path) return 'Helvetica';
  try {
    Font.register({ family: 'PetSans', fonts: [{ src: path }] });
    return 'PetSans';
  } catch {
    return 'Helvetica';
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} h`;
  return `${m}:${String(s).padStart(2, '0')} min`;
}

// m:ss — used for chart axis ticks (mirrors ganttUtils.formatRelativeTime).
function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}...` : s;
}

const C = {
  border: '#e2e8f0', muted: '#64748b', text: '#0f172a', bar: '#0088FE', barBg: '#f1f5f9',
  destructive: '#dc2626', accentBg: '#eff6ff', rowAlt: '#f8fafc',
};

// A4 = 595.28pt; page padding 32 each side → content width ≈ 531pt. Inside a
// drill section subtract padding/border → ≈ 505pt.
const PAGE_CONTENT_W = 531;

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: FONT_FAMILY, color: C.text },
  title: { fontSize: 18, marginBottom: 2 },
  subtitle: { fontSize: 9, color: C.muted, marginBottom: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  infoCell: { width: '33%', marginBottom: 6 },
  infoLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase' },
  infoValue: { fontSize: 10 },
  sectionTitle: { fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  chartCaption: { fontSize: 7, color: C.muted, marginBottom: 2 },
  chartBox: { borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, marginBottom: 16 },
  cards: { flexDirection: 'row', marginBottom: 16 },
  card: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, marginRight: 6 },
  cardLast: { marginRight: 0 },
  cardLabel: { fontSize: 7, color: C.muted },
  cardValue: { fontSize: 14, marginTop: 2 },
  drillBlock: { marginBottom: 16 },
  drillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  drillTitle: { fontSize: 12 },
  tag: { fontSize: 7, color: C.bar, backgroundColor: C.accentBg, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, marginLeft: 4 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 2, marginBottom: 2 },
  th: { fontSize: 7, color: C.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  cellLabel: { flex: 1 },
  cellNum: { width: 60, textAlign: 'right' },
  bar: { height: 4, backgroundColor: C.barBg, borderRadius: 2, marginTop: 2, marginBottom: 1 },
  barFill: { height: 4, backgroundColor: C.bar, borderRadius: 2 },
  twoCol: { flexDirection: 'row' },
  col: { flex: 1, marginRight: 10 },
  colLast: { flex: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
  footer: { position: 'absolute', bottom: 16, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: C.muted },
});

function pct(value: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.max(2, Math.round((value / max) * 100))}%`;
}

// ─── SVG chart helpers ──────────────────────────────────────────────────────

// SVG <Text> in react-pdf accepts fontSize/fontFamily/fontWeight at runtime, but
// the bundled types don't expose them — spread them via an untyped object.
function SvgText(props: {
  x: number; y: number; size?: number; fill?: string; weight?: number | 'bold';
  anchor?: 'start' | 'middle' | 'end';
  baseline?: 'auto' | 'middle' | 'central' | 'hanging';
  children: React.ReactNode;
}) {
  const { x, y, size = 8, fill = C.text, weight, anchor, baseline, children } = props;
  const fontProps: Record<string, unknown> = { fontFamily: FONT_FAMILY, fontSize: size };
  if (weight) fontProps.fontWeight = weight;
  return (
    <Text x={x} y={y} fill={fill} textAnchor={anchor} dominantBaseline={baseline} {...fontProps}>
      {children}
    </Text>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// Time-axis ticks (mirrors ganttUtils / timeline components).
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

type Slice = { label: string; totalTime: number; color: string };

function PieChartSvg({ data, width }: { data: Slice[]; width: number }) {
  const slices = data.filter((d) => d.totalTime > 0);
  const total = slices.reduce((s, d) => s + d.totalTime, 0);
  if (total <= 0) return null;

  const R = 48;
  const cx = R + 6;
  const cy = R + 6;
  const legendX = cx + R + 12;
  const rowH = 12;
  const height = Math.max(cy + R + 6, 6 + slices.length * rowH + 6);

  let angle = 0;
  return (
    <Svg width={width} height={height}>
      {slices.map((d, i) => {
        const sweep = (d.totalTime / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        if (sweep >= 359.99) {
          return <Circle key={i} cx={cx} cy={cy} r={R} fill={d.color} />;
        }
        return <Path key={i} d={arcPath(cx, cy, R, start, end)} fill={d.color} />;
      })}
      {slices.map((d, i) => (
        <G key={`lg-${i}`}>
          <Rect x={legendX} y={4 + i * rowH} width={7} height={7} fill={d.color} rx={1} />
          <SvgText x={legendX + 11} y={4 + i * rowH + 6} size={7} fill={C.text} anchor="start">
            {`${truncate(d.label, 16)}  ${formatClock(d.totalTime)}`}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

function BarChartSvg({ data, width }: { data: Slice[]; width: number }) {
  const rows = data.filter((d) => d.totalTime > 0);
  if (rows.length === 0) return null;

  const labelW = 78;
  const rightPad = 12;
  const barAreaW = width - labelW - rightPad;
  const rowH = 16;
  const barH = 10;
  const axisH = 16;
  const max = Math.max(...rows.map((r) => r.totalTime));
  const baseY = rows.length * rowH;
  const height = baseY + axisH;
  const xScale = (v: number) => (max > 0 ? (v / max) * barAreaW : 0);
  const ticks = [0, max / 2, max];

  return (
    <Svg width={width} height={height}>
      {rows.map((r, i) => {
        const y = i * rowH;
        const w = Math.max(xScale(r.totalTime), 1);
        return (
          <G key={i}>
            <SvgText x={labelW - 4} y={y + rowH / 2} size={7} fill={C.muted} anchor="end" baseline="central">
              {truncate(r.label, 15)}
            </SvgText>
            <Rect x={labelW} y={y + (rowH - barH) / 2} width={w} height={barH} fill={r.color} rx={2} />
          </G>
        );
      })}
      <Line x1={labelW} y1={baseY} x2={labelW + barAreaW} y2={baseY} stroke={C.border} strokeWidth={1} />
      {ticks.map((tk, i) => (
        <SvgText key={`t-${i}`} x={labelW + xScale(tk)} y={baseY + 11} size={6} fill={C.muted} anchor="middle">
          {formatClock(tk)}
        </SvgText>
      ))}
    </Svg>
  );
}

function DrillOverviewSvg({
  overview, width,
}: { overview: NonNullable<PdfReportModel['drillOverview']>; width: number }) {
  const drills = overview.drills;
  if (drills.length === 0) return null;

  const LABEL_W = 92;
  const padLeft = 8;
  const padRight = 16;
  const padTop = 8;
  const padBottom = 22;
  const rowH = 24;
  const barH = 15;
  const chartW = width - LABEL_W - padLeft - padRight;
  const maxTime = Math.max(...drills.map((d) => d.endOffset), overview.totalDuration ?? 0, 10_000);
  const ticks = calculateTicks(maxTime);
  const height = drills.length * rowH + padTop + padBottom;
  const xScale = (t: number) => LABEL_W + padLeft + (t / maxTime) * chartW;
  const axisY = padTop + drills.length * rowH;

  return (
    <Svg width={width} height={height}>
      {drills.map((_, i) => (
        <Rect
          key={`bg-${i}`}
          x={LABEL_W + padLeft} y={padTop + i * rowH} width={chartW} height={rowH}
          fill={i % 2 === 0 ? C.rowAlt : '#ffffff'}
        />
      ))}
      {ticks.map((tick) => (
        <Line
          key={`grid-${tick}`}
          x1={xScale(tick)} y1={padTop} x2={xScale(tick)} y2={axisY}
          stroke={C.border} strokeWidth={1}
        />
      ))}
      {drills.map((d, i) => (
        <SvgText key={`lbl-${i}`} x={4} y={padTop + i * rowH + rowH / 2} size={8} fill={C.muted} anchor="start" baseline="central">
          {truncate(d.label, 16)}
        </SvgText>
      ))}
      {drills.map((d, i) => {
        const x1 = xScale(d.startOffset);
        const x2 = xScale(d.endOffset);
        const barWidth = Math.max(x2 - x1, 3);
        const y = padTop + i * rowH + (rowH - barH) / 2;
        return (
          <G key={`bar-${i}`}>
            <Rect x={x1} y={y} width={barWidth} height={barH} fill={d.color} opacity={0.9} rx={3} />
            {barWidth >= 40 && (
              <SvgText x={x1 + barWidth / 2} y={y + barH / 2} size={8} fill="#ffffff" anchor="middle" baseline="central">
                {formatClock(d.duration)}
              </SvgText>
            )}
          </G>
        );
      })}
      <Line x1={LABEL_W + padLeft} y1={axisY} x2={LABEL_W + padLeft + chartW} y2={axisY} stroke={C.border} strokeWidth={1} />
      {ticks.map((tick) => (
        <SvgText key={`tk-${tick}`} x={xScale(tick)} y={axisY + 12} size={7} fill={C.muted} anchor="middle">
          {formatClock(tick)}
        </SvgText>
      ))}
    </Svg>
  );
}

function ActionTimelineSvg({
  timeline, width,
}: { timeline: NonNullable<PdfReportModel['drills'][number]['timeline']>; width: number }) {
  const { segments, counterEvents, actionLabels } = timeline;
  if (actionLabels.length === 0 || (segments.length === 0 && counterEvents.length === 0)) return null;

  const LABEL_W = 92;
  const padLeft = 8;
  const padRight = 16;
  const padTop = 8;
  const padBottom = 22;
  const rowH = 22;
  const barH = 13;
  const counterR = 4;
  const chartW = width - LABEL_W - padLeft - padRight;
  const segMax = segments.length > 0 ? Math.max(...segments.map((s) => s.endOffset)) : 0;
  const ctrMax = counterEvents.length > 0 ? Math.max(...counterEvents.map((e) => e.timestamp)) : 0;
  const maxTime = Math.max(10_000, segMax, ctrMax, timeline.totalDuration);
  const ticks = calculateTicks(maxTime);
  const height = actionLabels.length * rowH + padTop + padBottom;
  const axisY = padTop + actionLabels.length * rowH;

  const idxByLabel = new Map(actionLabels.map((a, i) => [a.label, i]));
  const xScale = (t: number) => LABEL_W + padLeft + (t / maxTime) * chartW;
  const yCenter = (label: string) => padTop + (idxByLabel.get(label) ?? 0) * rowH + rowH / 2;

  return (
    <Svg width={width} height={height}>
      {actionLabels.map((_, i) => (
        <Rect
          key={`bg-${i}`}
          x={LABEL_W + padLeft} y={padTop + i * rowH} width={chartW} height={rowH}
          fill={i % 2 === 0 ? C.rowAlt : '#ffffff'}
        />
      ))}
      {ticks.map((tick) => (
        <Line key={`grid-${tick}`} x1={xScale(tick)} y1={padTop} x2={xScale(tick)} y2={axisY} stroke={C.border} strokeWidth={1} />
      ))}
      {actionLabels.map((a, i) => (
        <SvgText key={`lbl-${i}`} x={4} y={padTop + i * rowH + rowH / 2} size={7} fill={C.muted} anchor="start" baseline="central">
          {truncate(a.label, 17)}
        </SvgText>
      ))}
      {segments.map((seg, i) => {
        const idx = idxByLabel.get(seg.label);
        if (idx === undefined) return null;
        const x1 = xScale(seg.startOffset);
        const x2 = xScale(seg.endOffset);
        const barWidth = Math.max(x2 - x1, 3);
        const y = padTop + idx * rowH + (rowH - barH) / 2;
        return <Rect key={`seg-${i}`} x={x1} y={y} width={barWidth} height={barH} fill={seg.color} opacity={0.9} rx={2} />;
      })}
      {counterEvents.map((evt, i) => (
        <Circle
          key={`ctr-${i}`}
          cx={xScale(evt.timestamp)} cy={yCenter(evt.label)} r={counterR}
          fill={evt.color} stroke="#ffffff" strokeWidth={1}
        />
      ))}
      <Line x1={LABEL_W + padLeft} y1={axisY} x2={LABEL_W + padLeft + chartW} y2={axisY} stroke={C.border} strokeWidth={1} />
      {ticks.map((tick) => (
        <SvgText key={`tk-${tick}`} x={xScale(tick)} y={axisY + 12} size={7} fill={C.muted} anchor="middle">
          {formatClock(tick)}
        </SvgText>
      ))}
    </Svg>
  );
}

// Pie + bar pair side by side, mirroring the on-screen two-up chart layout.
function PieBarRow({ data, width, caption }: { data: Slice[]; width: number; caption?: string }) {
  if (data.filter((d) => d.totalTime > 0).length === 0) return null;
  const pieW = Math.round(width * 0.42);
  const barW = width - pieW - 12;
  return (
    <View wrap={false}>
      {caption && <Text style={styles.chartCaption}>{caption}</Text>}
      <View style={styles.chartRow}>
        <View style={{ width: pieW, marginRight: 12 }}>
          <PieChartSvg data={data} width={pieW} />
        </View>
        <View style={{ width: barW }}>
          <BarChartSvg data={data} width={barW} />
        </View>
      </View>
    </View>
  );
}

// ─── Tables ─────────────────────────────────────────────────────────────────

function TimerTable({ t, rows, title }: { t: Record<string, string>; rows: PdfReportModel['overallTimers']; title: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.totalTime), 0);
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.cellLabel]}>{t.action}</Text>
        <Text style={[styles.th, styles.cellNum]}>{t.segments}</Text>
        <Text style={[styles.th, styles.cellNum]}>{t.total}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} wrap={false}>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>{r.label}</Text>
            <Text style={[styles.cellNum, { color: C.muted }]}>{r.segments}×</Text>
            <Text style={styles.cellNum}>{formatDuration(r.totalTime)}</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: pct(r.totalTime, max) }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CounterTable({ t, rows, title }: { t: Record<string, string>; rows: PdfReportModel['overallCounters']; title: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.cellLabel]}>{t.action}</Text>
        <Text style={[styles.th, styles.cellNum]}>{t.count}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.cellLabel}>{r.label}</Text>
          <Text style={styles.cellNum}>{r.count}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ model }: { model: PdfReportModel }) {
  const t = STRINGS[model.locale];
  const { info, summary } = model;

  const cells: Array<{ label: string; value: string }> = [];
  if (info.clubName) cells.push({ label: t.club, value: info.clubName });
  if (info.teamName) cells.push({ label: t.team, value: info.teamName });
  if (info.coachName) cells.push({ label: t.coach, value: info.coachName });
  if (info.trackedPlayerName) cells.push({ label: t.player, value: info.trackedPlayerName });
  if (info.date) cells.push({ label: t.date, value: info.date });

  // drillTimeData uses `name`; the chart helpers take the generic `label` Slice.
  const drillTimeSlices: Slice[] = (model.drillTimeData ?? []).map((d) => ({
    label: d.name, totalTime: d.totalTime, color: d.color,
  }));
  const overview = model.drillOverview;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>
          {t.generated}: {new Date(model.generatedAt).toLocaleString()}
        </Text>

        {cells.length > 0 && (
          <View style={styles.infoGrid}>
            {cells.map((c, i) => (
              <View key={i} style={styles.infoCell}>
                <Text style={styles.infoLabel}>{c.label}</Text>
                <Text style={styles.infoValue}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary cards */}
        <Text style={styles.sectionTitle}>{t.summary}</Text>
        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.drills}</Text>
            <Text style={styles.cardValue}>{summary.drills}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.totalTime}</Text>
            <Text style={styles.cardValue}>{formatDuration(summary.totalTime)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.passiveTime}</Text>
            <Text style={styles.cardValue}>{formatDuration(summary.passiveTime)}</Text>
          </View>
          <View style={[styles.card, styles.cardLast]}>
            <Text style={styles.cardLabel}>{t.passivePercent}</Text>
            <Text style={[styles.cardValue, summary.passivePercent > 40 ? { color: C.destructive } : {}]}>
              {summary.passivePercent}%
            </Text>
          </View>
        </View>

        {/* Drill overview timeline */}
        {overview && overview.drills.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t.trainingTimeline}</Text>
            <View style={styles.chartBox}>
              <DrillOverviewSvg overview={overview} width={PAGE_CONTENT_W - 16} />
            </View>
          </View>
        )}

        {/* Time per drill (pie + bar) */}
        {drillTimeSlices.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t.timePerDrill}</Text>
            <View style={styles.chartBox}>
              <PieBarRow data={drillTimeSlices} width={PAGE_CONTENT_W - 16} />
            </View>
          </View>
        )}

        {/* Overall tables */}
        {(model.overallTimers.length > 0 || model.overallCounters.length > 0) && (
          <View>
            <Text style={styles.sectionTitle}>{t.overall}</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                {model.overallTimers.length > 0 && (
                  <TimerTable t={t} rows={model.overallTimers} title={t.stoppedTimes} />
                )}
              </View>
              <View style={styles.colLast}>
                {model.overallCounters.length > 0 && (
                  <CounterTable t={t} rows={model.overallCounters} title={t.counters} />
                )}
              </View>
            </View>
          </View>
        )}

        {/* Per-drill detail. Each piece is its own atomic block so the report
            flows cleanly across pages instead of leaving an empty bordered box
            when a chart can't fit in the remaining space. */}
        {model.drills.map((d, i) => {
          const timeByAction = d.timeByAction ?? [];
          const timeline = d.timeline;
          const hasTimeline = !!timeline && (timeline.segments.length > 0 || timeline.counterEvents.length > 0);
          const hasPieBar = timeByAction.length > 0;

          const header = (
            <View style={styles.drillHeader}>
              <Text style={styles.drillTitle}>{t.drill} {d.drillNumber}</Text>
              {d.tags.map((tag, j) => (
                <Text key={j} style={styles.tag}>{tag}</Text>
              ))}
            </View>
          );
          const timelineBox = hasTimeline ? (
            <View style={styles.chartBox} wrap={false}>
              <ActionTimelineSvg timeline={timeline!} width={PAGE_CONTENT_W - 16} />
            </View>
          ) : null;
          const pieBarBox = hasPieBar ? (
            <View style={styles.chartBox} wrap={false}>
              <PieBarRow data={timeByAction} width={PAGE_CONTENT_W - 16} caption={t.timePerAction} />
            </View>
          ) : null;

          return (
            <View key={i} style={styles.drillBlock}>
              {/* Keep the drill header glued to its first chart so it never sits
                  alone at the foot of a page. */}
              <View wrap={false}>
                {header}
                {timelineBox ?? pieBarBox}
              </View>
              {timelineBox && pieBarBox}

              {(d.timers.length > 0 || d.counters.length > 0) && (
                <View style={styles.twoCol}>
                  <View style={styles.col}>
                    {d.timers.length > 0 && <TimerTable t={t} rows={d.timers} title={t.stoppedTimes} />}
                  </View>
                  <View style={styles.colLast}>
                    {d.counters.length > 0 && <CounterTable t={t} rows={d.counters} title={t.counters} />}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>{t.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Recommendation PDF ──────────────────────────────────────────────────────

const REC_STRINGS: Record<string, Record<string, string>> = {
  en: {
    title: 'Training Analysis',
    teiTitle: 'Training Efficiency Index (TEI)',
    activity: 'Activity', coaching: 'Coaching',
    repetitions: 'Repetitions', organisation: 'Organisation',
    strengths: 'Strengths', concerns: 'Areas for improvement',
    recommendations: 'Recommendations',
    generated: 'Generated', page: 'Page',
  },
  de: {
    title: 'Trainingsanalyse',
    teiTitle: 'Trainings-Effizienz-Index (TEI)',
    activity: 'Aktivität', coaching: 'Coaching',
    repetitions: 'Wiederholungen', organisation: 'Organisation',
    strengths: 'Stärken', concerns: 'Verbesserungsbereiche',
    recommendations: 'Empfehlungen',
    generated: 'Erstellt', page: 'Seite',
  },
};

const RC = {
  green:  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', bar: '#22c55e' },
  yellow: { bg: '#fefce8', border: '#fde047', text: '#854d0e', bar: '#eab308' },
  red:    { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', bar: '#ef4444' },
  s: { bg: '#f0fdf4', border: '#86efac', header: '#166534', body: '#14532d' },
  c: { bg: '#fffbeb', border: '#fcd34d', header: '#92400e', body: '#78350f' },
  r: { bg: '#eff6ff', border: '#93c5fd', header: '#1e40af', body: '#1e3a8a' },
};

const recStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: FONT_FAMILY, color: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  headerText: { marginLeft: 10 },
  // lineHeight is pinned to 1 so the title+subtitle block has a deterministic
  // height (16 + 4 + 8 = 28) that the header's PetLogoMark height is set to match.
  title: { fontSize: 16, lineHeight: 1, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 8, lineHeight: 1, color: '#64748b' },
  teiCard: { borderRadius: 6, borderWidth: 1, padding: 12, marginBottom: 16 },
  teiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  teiTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  teiRight: { flexDirection: 'row', alignItems: 'flex-end' },
  teiScore: { fontSize: 26, fontWeight: 'bold', marginRight: 4 },
  teiGrade: { fontSize: 9, fontWeight: 'bold', borderWidth: 1, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, marginBottom: 2 },
  indexRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  indexLabel: { fontSize: 8, color: '#64748b', width: 80 },
  indexTrack: { flex: 1, height: 5, backgroundColor: '#e2e8f0', borderRadius: 2 },
  indexFill: { height: 5, borderRadius: 2 },
  indexValue: { width: 36, fontSize: 8, color: '#64748b', textAlign: 'right' },
  summary: { fontSize: 9, color: '#64748b', fontStyle: 'italic', marginBottom: 16 },
  section: { borderRadius: 6, borderWidth: 1, padding: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  bullet: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { fontSize: 9, width: 10 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5 },
  recFooter: { position: 'absolute', bottom: 16, left: 32, right: 32, height: 12, fontSize: 7, color: '#94a3b8' },
  footerBrand: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerBrandText: { marginLeft: 4, fontSize: 7, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  footerPage: { position: 'absolute', right: 0, top: 0 },
});

// The stem + bowl mark from PracMetricsLogo.tsx (web), redrawn for @react-pdf/renderer.
// idPrefix keeps gradient ids unique when the mark is rendered more than once per document.
function PetLogoMark({ height = 20, idPrefix }: { height?: number; idPrefix: string }) {
  const width = (height * 380) / 318;
  return (
    <Svg viewBox="20 22 380 318" style={{ width, height }}>
      <Defs>
        <LinearGradient id={`${idPrefix}-stem`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2f8bf9" />
          <Stop offset="55%" stopColor="#1066e4" />
          <Stop offset="100%" stopColor="#0246c2" />
        </LinearGradient>
        <LinearGradient id={`${idPrefix}-bowl`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1a2c4c" />
          <Stop offset="100%" stopColor="#0c1830" />
        </LinearGradient>
      </Defs>
      <Path d="M 160,128 L 248,128 L 114,330 L 26,330 Z" fill={`url(#${idPrefix}-stem)`} />
      <Path d="M 96,30 L 344,42 L 388,112 L 200,250 L 235,180 L 330,118 L 150,78 Z" fill={`url(#${idPrefix}-bowl)`} />
    </Svg>
  );
}

function RecIndexBar({ label, value, max, barColor }: { label: string; value: number; max: number; barColor: string }) {
  const fillPct = `${Math.max(1, Math.round((value / max) * 100))}%`;
  return (
    <View style={recStyles.indexRow}>
      <Text style={recStyles.indexLabel}>{label}</Text>
      <View style={recStyles.indexTrack}>
        <View style={[recStyles.indexFill, { width: fillPct, backgroundColor: barColor }]} />
      </View>
      <Text style={recStyles.indexValue}>{value}/{max}</Text>
    </View>
  );
}

function RecBulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <>
      {items.map((text, i) => (
        <View key={i} style={recStyles.bullet}>
          <Text style={[recStyles.bulletDot, { color }]}>{'•'}</Text>
          <Text style={[recStyles.bulletText, { color }]}>{text}</Text>
        </View>
      ))}
    </>
  );
}

function RecommendationDocument({ recommendation, lang }: { recommendation: Recommendation; lang: string }) {
  const t = REC_STRINGS[lang] ?? REC_STRINGS['en'];
  const doc = recommendation.document;
  const tei = doc.tei;
  const pal = tei ? (tei.total >= 70 ? RC.green : tei.total >= 50 ? RC.yellow : RC.red) : null;

  return (
    <Document>
      <Page size="A4" style={recStyles.page}>
        <View style={recStyles.header}>
          <PetLogoMark height={28} idPrefix="hdr" />
          <View style={recStyles.headerText}>
            <Text style={recStyles.title}>{t.title}</Text>
            <Text style={recStyles.subtitle}>
              {t.generated}: {recommendation.updatedAt.split('T')[0]}
            </Text>
          </View>
        </View>

        {tei && pal && (
          <View style={[recStyles.teiCard, { backgroundColor: pal.bg, borderColor: pal.border }]}>
            <View style={recStyles.teiHeader}>
              <Text style={[recStyles.teiTitle, { color: pal.text }]}>{t.teiTitle}</Text>
              <View style={recStyles.teiRight}>
                <Text style={[recStyles.teiScore, { color: pal.text }]}>{tei.total}</Text>
                <Text style={[recStyles.teiGrade, { color: pal.text, borderColor: pal.border }]}>{tei.grade}</Text>
              </View>
            </View>
            <RecIndexBar label={t.activity}      value={tei.activity}      max={40} barColor={pal.bar} />
            <RecIndexBar label={t.coaching}       value={tei.coaching}      max={20} barColor={pal.bar} />
            <RecIndexBar label={t.repetitions}    value={tei.repetitions}   max={20} barColor={pal.bar} />
            <RecIndexBar label={t.organisation}   value={tei.organisation}  max={20} barColor={pal.bar} />
          </View>
        )}

        {doc.summary && <Text style={recStyles.summary}>{doc.summary}</Text>}

        {(doc.strengths?.length ?? 0) > 0 && (
          <View style={[recStyles.section, { backgroundColor: RC.s.bg, borderColor: RC.s.border }]}>
            <Text style={[recStyles.sectionTitle, { color: RC.s.header }]}>{t.strengths}</Text>
            <RecBulletList items={doc.strengths!} color={RC.s.body} />
          </View>
        )}

        {(doc.concerns?.length ?? 0) > 0 && (
          <View style={[recStyles.section, { backgroundColor: RC.c.bg, borderColor: RC.c.border }]}>
            <Text style={[recStyles.sectionTitle, { color: RC.c.header }]}>{t.concerns}</Text>
            <RecBulletList items={doc.concerns!} color={RC.c.body} />
          </View>
        )}

        {(doc.recommendations?.length ?? 0) > 0 && (
          <View style={[recStyles.section, { backgroundColor: RC.r.bg, borderColor: RC.r.border }]}>
            <Text style={[recStyles.sectionTitle, { color: RC.r.header }]}>{t.recommendations}</Text>
            <RecBulletList items={doc.recommendations!} color={RC.r.body} />
          </View>
        )}

        <View style={recStyles.recFooter} fixed>
          <View style={recStyles.footerBrand}>
            <PetLogoMark height={9} idPrefix="ftr" />
            <Text style={recStyles.footerBrandText}>PracMetrics</Text>
          </View>
          <Text
            style={recStyles.footerPage}
            render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export class ReactPdfRenderer implements PdfRenderer {
  async render(model: PdfReportModel): Promise<Buffer> {
    return renderToBuffer(<ReportDocument model={model} />);
  }

  async renderRecommendation(recommendation: Recommendation, lang: string): Promise<Buffer> {
    return renderToBuffer(<RecommendationDocument recommendation={recommendation} lang={lang} />);
  }
}
