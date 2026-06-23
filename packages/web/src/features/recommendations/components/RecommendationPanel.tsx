import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { Sparkles, Loader2, X } from 'lucide-react';
import type { Recommendation } from '@pet/shared';
import { Button } from '../../../shared/components/ui/button.js';
import { RecommendationView } from './RecommendationView.js';
import { useRecommendationStream } from '../hooks/useRecommendationStream.js';
import { getRecommendation } from '../api/recommendation.api.js';

interface RecommendationPanelProps {
  sessionId: string;
  accessToken: string;
  disabled?: boolean;
  disabledReason?: string;
}

type PanelView = 'intro' | 'streaming' | 'error' | 'result';

export function RecommendationPanel({ sessionId, accessToken, disabled, disabledReason }: RecommendationPanelProps) {
  const { t } = useTranslation('pet');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>('intro');
  const [existingRecommendation, setExistingRecommendation] = useState<Recommendation | null>(null);
  const { status, recommendation, error, generate } = useRecommendationStream();

  useEffect(() => {
    if (!open || !accessToken) return;
    getRecommendation(sessionId, accessToken)
      .then((rec) => {
        setExistingRecommendation(rec);
        setView('result');
      })
      .catch(() => {
        // No existing recommendation — stay on 'intro'
        setView('intro');
      });
  }, [open, sessionId, accessToken]);

  useEffect(() => {
    if (status === 'ready' && recommendation) {
      setView('result');
    } else if (status === 'fetching' || status === 'generating') {
      setView('streaming');
    } else if (status === 'error') {
      setView('error');
    }
  }, [status, recommendation]);

  function handleStart() {
    generate(sessionId, accessToken);
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      setView('intro');
    }
  }

  const displayedRecommendation = recommendation ?? existingRecommendation;

  const statusLabel = status === 'fetching'
    ? t('recommendation.statusFetching')
    : status === 'generating'
      ? t('recommendation.statusGenerating')
      : null;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          title={disabledReason}
        >
          <Sparkles className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">{t('results.analyseButton')}</span>
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl max-h-[90vh] flex flex-col bg-background border border-border rounded-lg shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('recommendation.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {view === 'intro' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('recommendation.intro')}</p>
              </div>
            )}

            {view === 'error' && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {view === 'streaming' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{statusLabel}</p>
              </div>
            )}

            {view === 'result' && displayedRecommendation && (
              <RecommendationView recommendation={displayedRecommendation} />
            )}
          </div>

          {/* Footer — only the initial generate step; once a recommendation exists it is read-only */}
          {view === 'intro' && (
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              <Dialog.Close asChild>
                <Button variant="outline" size="sm">{t('recommendation.cancel')}</Button>
              </Dialog.Close>
              <Button size="sm" onClick={handleStart}>
                {t('recommendation.start')}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
