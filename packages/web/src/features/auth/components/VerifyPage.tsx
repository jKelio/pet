import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api.js';
import { useAuthStore } from '../stores/auth.store.js';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card.js';

type Status = 'verifying' | 'success' | 'error';

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Ungültiger Link. Bitte fordere einen neuen Login-Link an.');
      return;
    }

    authApi.verify(token)
      .then(({ accessToken, user }) => {
        setAuth(accessToken, user);
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message ?? 'Der Login-Link ist ungültig oder abgelaufen.');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            {status === 'verifying' && <CardTitle>Anmeldung wird überprüft…</CardTitle>}
            {status === 'success' && <CardTitle>Erfolgreich eingeloggt!</CardTitle>}
            {status === 'error' && <CardTitle>Anmeldung fehlgeschlagen</CardTitle>}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-4">
            {status === 'verifying' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <CardDescription className="text-center">{errorMessage}</CardDescription>
                <Button variant="outline" onClick={() => navigate('/auth/login')}>
                  Neuen Link anfordern
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
