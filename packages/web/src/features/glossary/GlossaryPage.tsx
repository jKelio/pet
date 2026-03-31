import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';

interface GlossaryTerm {
  term: string;
  definition: string;
}

export function GlossaryPage() {
  const { t } = useTranslation('glossary');
  const terms = t('terms', { returnObjects: true }) as GlossaryTerm[];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <dl className="space-y-4">
          {terms.map((item) => (
            <div
              key={item.term}
              className="rounded-lg border border-border bg-card p-4"
            >
              <dt className="font-semibold text-sm">{item.term}</dt>
              <dd className="text-sm text-muted-foreground mt-1">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
