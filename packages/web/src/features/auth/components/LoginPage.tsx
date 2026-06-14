import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/button.js';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card.js';
import { authApi } from '../api/auth.api.js';
import { ApiClientError } from '../../../shared/lib/api-client.js';
import { Mail, Loader2 } from 'lucide-react';
import { PracMetricsLogo } from '../../../shared/components/PracMetricsLogo.js';

type Step = 'email' | 'sent';

export function LoginPage() {
  const { t } = useTranslation('pet');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authApi.sendMagicLink(email);
      setStep('sent');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(t('auth.unexpectedError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <PracMetricsLogo variant="stacked" className="mx-auto mb-3" />
        </div>

        <Card>
          {step === 'email' ? (
            <>
              <CardHeader>
                <CardTitle>{t('auth.login')}</CardTitle>
                <CardDescription>
                  {t('auth.loginDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.emailLabel')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {t('auth.sendLink')}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>{t('auth.checkEmailTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.checkEmailPre')} <strong>{email}</strong>{t('auth.checkEmailPost')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center py-4">
                  <Mail className="h-12 w-12 text-muted-foreground" />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                >
                  {t('auth.useAnotherEmail')}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => void handleSubmit()}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('auth.resendLink')}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
