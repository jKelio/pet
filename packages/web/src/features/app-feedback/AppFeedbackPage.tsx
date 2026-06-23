import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Paperclip, X } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Label } from '../../shared/components/ui/label.js';
import { Textarea } from '../../shared/components/ui/textarea.js';
import { cn } from '../../shared/lib/utils.js';
import { useAuth } from '../auth/hooks/useAuth.js';
import { apiClient } from '../../shared/lib/api-client.js';

type FeedbackType = 'bug' | 'feature' | 'general';

const TYPES: { value: FeedbackType; labelKey: string }[] = [
  { value: 'bug', labelKey: 'appFeedback.typeBug' },
  { value: 'feature', labelKey: 'appFeedback.typeFeature' },
  { value: 'general', labelKey: 'appFeedback.typeGeneral' },
];

export function AppFeedbackPage() {
  const { t } = useTranslation('pet');
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<FeedbackType>('general');
  const [text, setText] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setScreenshot(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || status === 'submitting') return;

    setStatus('submitting');
    try {
      const form = new FormData();
      form.append('type', type);
      form.append('text', text.trim());
      if (screenshot) form.append('screenshot', screenshot);

      await apiClient.postForm('/app-feedback', form, accessToken ?? undefined);
      setStatus('success');
      setText('');
      removeScreenshot();
      setType('general');
    } catch {
      setStatus('error');
    }
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
        {status === 'success' ? (
          <div className="max-w-xl rounded-lg border border-border bg-card p-6 text-center space-y-4">
            <p className="text-sm">{t('appFeedback.successMessage')}</p>
            <Button variant="outline" onClick={() => setStatus('idle')}>
              {t('appFeedback.submitButton')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
            <div className="space-y-2">
              <Label>{t('appFeedback.typeLabel')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

            <div className="space-y-2">
              <Label className="block">{t('appFeedback.screenshotLabel')}</Label>
              {screenshot ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{screenshot.name}</span>
                  <button type="button" onClick={removeScreenshot} className="shrink-0 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  {t('appFeedback.screenshotButton')}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-destructive">{t('appFeedback.errorMessage')}</p>
            )}

            <Button
              type="submit"
              disabled={!text.trim() || status === 'submitting'}
              className="w-full sm:w-auto"
            >
              {status === 'submitting' ? '…' : t('appFeedback.submitButton')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
