import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Label } from '../../shared/components/ui/label.js';
import { Textarea } from '../../shared/components/ui/textarea.js';
import { cn } from '../../shared/lib/utils.js';
import { useAuth } from '../auth/hooks/useAuth.js';
import { buildIssueUrl, type FeedbackType } from './lib/buildIssueUrl.js';

const TYPES: { value: FeedbackType; labelKey: string }[] = [
  { value: 'bug', labelKey: 'appFeedback.typeBug' },
  { value: 'feature', labelKey: 'appFeedback.typeFeature' },
  { value: 'general', labelKey: 'appFeedback.typeGeneral' },
];

export function AppFeedbackPage() {
  const { t } = useTranslation('pet');
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>('general');
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const name = user?.name || user?.email || 'Anonymous';
    const url = buildIssueUrl({ type, text, name });
    window.open(url, '_blank', 'noopener,noreferrer');
    setText('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('appFeedback.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{t('appFeedback.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
          <div className="space-y-2">
            <Label>{t('appFeedback.typeLabel')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, labelKey }) => (
                <Button
                  key={value}
                  type="button"
                  variant={type === value ? 'default' : 'outline'}
                  className={cn('w-full')}
                  onClick={() => setType(value)}
                >
                  {t(labelKey)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-text">{t('appFeedback.feedbackLabel')}</Label>
            <Textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('appFeedback.feedbackPlaceholder')}
            />
          </div>

          <Button type="submit" disabled={!text.trim()} className="w-full sm:w-auto">
            {t('appFeedback.submitButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
