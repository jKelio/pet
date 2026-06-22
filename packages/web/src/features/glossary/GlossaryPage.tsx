import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, X } from 'lucide-react';

interface GlossaryTerm {
  term: string;
  definition: string;
}

interface GlossarySection {
  heading: string;
  terms: GlossaryTerm[];
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function TermCard({ term, definition, query }: GlossaryTerm & { query: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <dt className="font-semibold text-sm">{highlightText(term, query)}</dt>
      <dd className="text-sm text-muted-foreground mt-1">{highlightText(definition, query)}</dd>
    </div>
  );
}

const GRID = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

export function GlossaryPage() {
  const { t } = useTranslation('glossary');
  const sections = t('sections', { returnObjects: true }) as GlossarySection[];
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim();

  const filteredTerms = useMemo(() => {
    if (!trimmedQuery) return null;
    const lower = trimmedQuery.toLowerCase();
    return sections
      .flatMap((s) => s.terms)
      .filter(
        (item) =>
          item.term.toLowerCase().includes(lower) ||
          item.definition.toLowerCase().includes(lower),
      );
  }, [sections, trimmedQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredTerms !== null ? (
          filteredTerms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-8">{t('noResults')}</p>
          ) : (
            <dl className={GRID}>
              {filteredTerms.map((item) => (
                <TermCard key={item.term} term={item.term} definition={item.definition} query={trimmedQuery} />
              ))}
            </dl>
          )
        ) : (
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {section.heading}
                </h2>
                <dl className={GRID}>
                  {section.terms.map((item) => (
                    <TermCard key={item.term} term={item.term} definition={item.definition} query="" />
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
