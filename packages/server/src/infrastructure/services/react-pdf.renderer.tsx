import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import type { PdfReportModel } from '@pet/shared';
import type { PdfRenderer } from '../../domain/ports/pdf-renderer.js';

type Locale = PdfReportModel['locale'];

// Static report chrome per locale. Dynamic content (action/tag labels, practice
// info) arrives already localized in the model.
const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    title: 'Training Report', summary: 'Summary', drills: 'Drills', totalTime: 'Total time',
    wasteTime: 'Waste time', wastePercent: 'Waste %', overall: 'Overall', stoppedTimes: 'Stopped times',
    counters: 'Counters', action: 'Action', segments: 'Segments', total: 'Total', count: 'Count',
    drill: 'Drill', club: 'Club', team: 'Team', coach: 'Coach', player: 'Player', date: 'Date',
    generated: 'Generated', page: 'Page',
  },
  de: {
    title: 'Trainingsbericht', summary: 'Übersicht', drills: 'Drills', totalTime: 'Gesamtzeit',
    wasteTime: 'Leerlaufzeit', wastePercent: 'Leerlauf %', overall: 'Gesamt', stoppedTimes: 'Gestoppte Zeiten',
    counters: 'Zähler', action: 'Aktion', segments: 'Segmente', total: 'Gesamt', count: 'Anzahl',
    drill: 'Drill', club: 'Verein', team: 'Team', coach: 'Trainer', player: 'Spieler', date: 'Datum',
    generated: 'Erstellt', page: 'Seite',
  },
  ru: {
    title: 'Отчёт о тренировке', summary: 'Сводка', drills: 'Упражнения', totalTime: 'Общее время',
    wasteTime: 'Простой', wastePercent: 'Простой %', overall: 'Итого', stoppedTimes: 'Засечённое время',
    counters: 'Счётчики', action: 'Действие', segments: 'Сегменты', total: 'Всего', count: 'Кол-во',
    drill: 'Упражнение', club: 'Клуб', team: 'Команда', coach: 'Тренер', player: 'Игрок', date: 'Дата',
    generated: 'Создано', page: 'Стр.',
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

const C = {
  border: '#e2e8f0', muted: '#64748b', text: '#0f172a', bar: '#0088FE', barBg: '#f1f5f9',
  destructive: '#dc2626', accentBg: '#eff6ff',
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: FONT_FAMILY, color: C.text },
  title: { fontSize: 18, marginBottom: 2 },
  subtitle: { fontSize: 9, color: C.muted, marginBottom: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  infoCell: { width: '33%', marginBottom: 6 },
  infoLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase' },
  infoValue: { fontSize: 10 },
  sectionTitle: { fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  cards: { flexDirection: 'row', marginBottom: 16 },
  card: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, marginRight: 6 },
  cardLast: { marginRight: 0 },
  cardLabel: { fontSize: 7, color: C.muted },
  cardValue: { fontSize: 14, marginTop: 2 },
  drillSection: { marginBottom: 14, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10 },
  drillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  drillTitle: { fontSize: 11 },
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
  footer: { position: 'absolute', bottom: 16, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: C.muted },
});

function pct(value: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.max(2, Math.round((value / max) * 100))}%`;
}

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
            <Text style={styles.cardLabel}>{t.wasteTime}</Text>
            <Text style={styles.cardValue}>{formatDuration(summary.wasteTime)}</Text>
          </View>
          <View style={[styles.card, styles.cardLast]}>
            <Text style={styles.cardLabel}>{t.wastePercent}</Text>
            <Text style={[styles.cardValue, summary.wastePercent > 30 ? { color: C.destructive } : {}]}>
              {summary.wastePercent}%
            </Text>
          </View>
        </View>

        {/* Overall */}
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

        {/* Per-drill detail */}
        {model.drills.map((d, i) => (
          <View key={i} style={styles.drillSection} wrap={false}>
            <View style={styles.drillHeader}>
              <Text style={styles.drillTitle}>{t.drill} {d.drillNumber}</Text>
              {d.tags.map((tag, j) => (
                <Text key={j} style={styles.tag}>{tag}</Text>
              ))}
            </View>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                {d.timers.length > 0 && <TimerTable t={t} rows={d.timers} title={t.stoppedTimes} />}
              </View>
              <View style={styles.colLast}>
                {d.counters.length > 0 && <CounterTable t={t} rows={d.counters} title={t.counters} />}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{t.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export class ReactPdfRenderer implements PdfRenderer {
  async render(model: PdfReportModel): Promise<Buffer> {
    return renderToBuffer(<ReportDocument model={model} />);
  }
}
