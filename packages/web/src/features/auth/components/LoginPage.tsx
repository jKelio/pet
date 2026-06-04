import { useState } from 'react';
import { Button } from '../../../shared/components/ui/button.js';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card.js';
import { authApi } from '../api/auth.api.js';
import { ApiClientError } from '../../../shared/lib/api-client.js';
import { Mail, Loader2 } from 'lucide-react';

type Step = 'email' | 'sent';

export function LoginPage() {
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
        setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">PROTRACK</h1>
          <p className="text-muted-foreground mt-1">Practice Efficiency Tracking</p>
        </div>

        <Card>
          {step === 'email' ? (
            <>
              <CardHeader>
                <CardTitle>Einloggen</CardTitle>
                <CardDescription>
                  Gib deine E-Mail-Adresse ein. Wir senden dir einen Login-Link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail-Adresse</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="coach@hcclub.de"
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
                    Login-Link senden
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Prüfe deine E-Mails</CardTitle>
                <CardDescription>
                  Wir haben einen Login-Link an <strong>{email}</strong> gesendet.
                  Der Link ist 15 Minuten gültig.
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
                  Andere E-Mail verwenden
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => void handleSubmit()}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Link erneut senden
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
