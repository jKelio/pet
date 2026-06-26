import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import jsPDF from 'jspdf';
import type { Recommendation, TeiScores } from '@pet/shared';
import { Button } from '../../../shared/components/ui/button.js';

interface RecommendationViewProps {
  recommendation: Recommendation;
}

function BulletSection({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 text-sm ${className ?? ''}`}>
          <span className="mt-0.5 shrink-0">•</span>
          <span className="whitespace-pre-line">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TeiCard({ tei }: { tei: TeiScores }) {
  const { t } = useTranslation('pet');
  const color = tei.total >= 70 ? 'green' : tei.total >= 50 ? 'yellow' : 'red';
  const c = {
    green:  { bg: 'bg-green-50 dark:bg-green-950/30',   border: 'border-green-200 dark:border-green-800',   text: 'text-green-700 dark:text-green-300',   bar: 'bg-green-500'  },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', bar: 'bg-yellow-500' },
    red:    { bg: 'bg-red-50 dark:bg-red-950/30',       border: 'border-red-200 dark:border-red-800',       text: 'text-red-700 dark:text-red-300',       bar: 'bg-red-500'   },
  }[color];

  const indices = [
    { label: t('recommendation.teiActivity'),      value: tei.activity,      max: 40 },
    { label: t('recommendation.teiCoaching'),       value: tei.coaching,      max: 20 },
    { label: t('recommendation.teiRepetitions'),    value: tei.repetitions,   max: 20 },
    { label: t('recommendation.teiOrganisation'),   value: tei.organisation,  max: 20 },
  ];

  return (
    <section className={`pdf-section rounded-lg border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${c.text}`}>
          {t('recommendation.teiTitle')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-3xl font-bold ${c.text}`}>{tei.total}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${c.border} ${c.text}`}>
            {tei.grade}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {indices.map(({ label, value, max }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs w-28 shrink-0 text-muted-foreground">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bar}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
              {value}/{max}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecommendationView({ recommendation }: RecommendationViewProps) {
  const { t } = useTranslation('pet');
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { document: doc } = recommendation;

  const exportToPdf = async () => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const container = exportRef.current;
      const savedStyle = container.getAttribute('style') ?? '';
      container.style.cssText = 'position:fixed;left:0;top:0;z-index:-9999;opacity:1;width:800px;overflow:visible';
      await new Promise((r) => setTimeout(r, 300));

      const sections = container.querySelectorAll<HTMLElement>('.pdf-section');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableW = pdfW - 2 * margin;
      const usableH = pdf.internal.pageSize.getHeight() - 2 * margin;
      let currentY = 0;
      let first = true;

      for (let i = 0; i < sections.length; i++) {
        try {
          const dataUrl = await domToPng(sections[i], { scale: 2, quality: 0.92, backgroundColor: '#ffffff' });
          const img = new Image();
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
          const scaledH = (img.height * usableW) / img.width;
          if (!first && currentY + scaledH > usableH) { pdf.addPage(); currentY = 0; }
          pdf.addImage(dataUrl, 'PNG', margin, margin + currentY, usableW, scaledH);
          currentY += scaledH + 5;
          first = false;
        } catch { /* skip */ }
      }

      container.setAttribute('style', savedStyle);
      const date = new Date().toISOString().split('T')[0];
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recommendation-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportToPdf} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="ml-1.5">{t('recommendation.pdfExport')}</span>
        </Button>
      </div>

      <div ref={exportRef} className="space-y-6">
        {doc.tei && <TeiCard tei={doc.tei} />}

        {doc.summary && (
          <p className="text-sm text-muted-foreground italic px-1">{doc.summary}</p>
        )}

        {(doc.strengths?.length ?? 0) > 0 && (
          <section className="pdf-section space-y-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 uppercase tracking-wider">
              {t('recommendation.sectionStrengths')}
            </h3>
            <BulletSection items={doc.strengths ?? []} className="text-green-900 dark:text-green-100" />
          </section>
        )}

        {(doc.concerns?.length ?? 0) > 0 && (
          <section className="pdf-section space-y-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              {t('recommendation.sectionConcerns')}
            </h3>
            <BulletSection items={doc.concerns ?? []} className="text-amber-900 dark:text-amber-100" />
          </section>
        )}

        {(doc.recommendations?.length ?? 0) > 0 && (
          <section className="pdf-section space-y-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              {t('recommendation.sectionRecommendations')}
            </h3>
            <BulletSection items={doc.recommendations ?? []} className="text-blue-900 dark:text-blue-100" />
          </section>
        )}

      </div>
    </div>
  );
}
