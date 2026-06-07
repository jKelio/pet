import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Source } from '@pet/shared';
import { listSources } from '../api/recommendation.api.js';

interface SourcePickerProps {
  accessToken: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function SourcePicker({ accessToken, selected, onChange }: SourcePickerProps) {
  const { t } = useTranslation('pet');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    listSources(accessToken)
      .then(setSources)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [accessToken]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < 5) {
      onChange([...selected, id]);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">…</p>;
  if (loadError) return <p className="text-sm text-destructive">{t('sources.errorLoad')}</p>;
  if (sources.length === 0) return <p className="text-sm text-muted-foreground">{t('recommendation.noSources')}</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t('recommendation.sourcesHint')}</p>
      <ul className="space-y-1 max-h-64 overflow-y-auto">
        {sources.map((source) => {
          const isSelected = selected.includes(source.id);
          const isDisabled = !isSelected && selected.length >= 5;
          return (
            <li key={source.id}>
              <label className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted/50'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggle(source.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{source.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
